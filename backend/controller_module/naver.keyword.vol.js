/**
 * 네이버 검색광고 API를 이용해 키워드 및 연관 키워드의 검색량을 조회하는 CLI 도구
 *
 * - 터미널에서 검색어를 입력하면 해당 키워드와 연관 키워드들의 PC/모바일/총 검색량을 표로 출력합니다.
 * - 네이버 검색광고 API의 /keywordstool 엔드포인트를 사용합니다.
 * - 인증을 위해 X-Timestamp, X-API-KEY, X-Customer, X-Signature 헤더를 포함합니다.
 * - 시그니처는 공식 문서 방식(HMAC-SHA256, secretKey는 base64 디코딩 없이 utf-8로 사용)으로 생성합니다.
 *
 * 사용법:
 *   1. node module/naver.keyword.vol.js 실행
 *   2. 검색어 입력 → 연관 키워드와 검색량 표 출력
 *   3. 'q' 입력 시 종료
 */
const axios = require('axios');
const crypto = require('crypto');
const readline = require('readline');

class NaverSearchAPI {
    constructor() {
        this.customerId = '2708075';
        this.apiKey = '0100000000b62d7b33e8c8802cd536da976902c824be8a5a34b0fe73865d4360a5f4c05391';
        this.secretKey = 'AQAAAAC2LXsz6MiALNU22pdpAsgkYdmcZdfmvPB+rRfuez8Gdw==';
        this.baseUrl = 'https://api.searchad.naver.com';
    }

    generateSignature(timestamp, method, uri) {
        const message = timestamp + '.' + method + '.' + uri;
        const signature = crypto.createHmac('sha256', Buffer.from(this.secretKey, 'utf-8'))
            .update(message)
            .digest('base64');
        return signature;
    }

    async getKeywordStats(keyword) {
        const timestamp = Date.now().toString();
        const method = 'GET';
        const uri = '/keywordstool';
        
        const signature = this.generateSignature(timestamp, method, uri);
        
        const headers = {
            'X-Timestamp': timestamp,
            'X-API-KEY': this.apiKey,
            'X-Customer': this.customerId,
            'X-Signature': signature,
            'Content-Type': 'application/json'
        };
        
        const params = {
            hintKeywords: keyword,
            showDetail: 1
        };
        
        try {
            // 디버깅을 위한 정보 출력
            console.log('\n=== API 요청 정보 ===');
            console.log(`URL: ${this.baseUrl}${uri}`);
            console.log('Headers:', JSON.stringify(headers, null, 2));
            console.log('Params:', JSON.stringify(params, null, 2));
            
            const response = await axios.get(`${this.baseUrl}${uri}`, {
                headers,
                params
            });
            
            // 응답 정보 출력
            console.log('\n=== API 응답 정보 ===');
            console.log('Status Code:', response.status);
            console.log('Response Headers:', response.headers);
            console.log('Response Body:', JSON.stringify(response.data).slice(0, 500) + '...');
            
            const data = response.data;
            
            if (!data.keywordList || data.keywordList.length === 0) {
                throw new Error('키워드 데이터가 없습니다.');
            }
            
            return data;
            
        } catch (error) {
            console.log('오류 발생:', error.message);
            if (error.response) {
                console.log('Response Data:', error.response.data);
            }
            return null;
        }
    }
}

async function main() {
    const api = new NaverSearchAPI();
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    while (true) {
        const keyword = await new Promise(resolve => {
            rl.question('\n검색어를 입력하세요 (종료하려면 q 입력): ', resolve);
        });

        if (keyword.toLowerCase() === 'q') {
            console.log('프로그램을 종료합니다.');
            rl.close();
            break;
        }

        if (!keyword.trim()) {
            console.log('검색어를 입력해주세요.');
            continue;
        }

        console.log(`\n'${keyword}' 검색 중...`);
        const result = await api.getKeywordStats(keyword);

        if (result && Array.isArray(result.keywordList)) {
            console.log('\n[연관 키워드 검색량]');
            console.log('------------------------------------------');
            console.log('키워드\t\tPC검색량\t모바일검색량\t총합');
            console.log('------------------------------------------');
            result.keywordList.forEach(item => {
                const pc = item.monthlyPcQcCnt === "<10" ? 0 : Number(item.monthlyPcQcCnt);
                const mobile = item.monthlyMobileQcCnt === "<10" ? 0 : Number(item.monthlyMobileQcCnt);
                const total = pc + mobile;
                console.log(`${item.relKeyword}\t${pc}\t${mobile}\t${total}`);
            });
            console.log('------------------------------------------');
        } else {
            console.log('검색량을 가져오는데 실패했습니다.');
        }
    }
}

main().catch(console.error); 