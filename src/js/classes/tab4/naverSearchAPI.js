const axios = require('axios');
const crypto = require('crypto');

class NaverSearchAPI {
    constructor() {
        this.customerId = '2708075';
        this.apiKey = '0100000000b62d7b33e8c8802cd536da976902c824be8a5a34b0fe73865d4360a5f4c05391';
        this.secretKey = 'AQAAAAC2LXsz6MiALNU22pdpAsgkYdmcZdfmvPB+rRfuez8Gdw==';
        this.baseUrl = 'https://api.searchad.naver.com';
        this.retryCount = 10;  // 재시도 횟수를 10회로 증가
        this.retryDelay = 2000;  // 재시도 대기 시간 (ms)
    }

    // 대기 함수
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    generateSignature(timestamp, method, uri) {
        const message = timestamp + '.' + method + '.' + uri;
        const signature = crypto.createHmac('sha256', Buffer.from(this.secretKey, 'utf-8'))
            .update(message)
            .digest('base64');
        return signature;
    }

    async getKeywordStats(keyword, retryAttempt = 0) {
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
            const response = await axios.get(`${this.baseUrl}${uri}`, {
                headers,
                params
            });
            
            const data = response.data;
            
            if (!data.keywordList || data.keywordList.length === 0) {
                throw new Error('키워드 데이터가 없습니다.');
            }
            
            return data;
            
        } catch (error) {
            if (error.response && error.response.status === 429 && retryAttempt < this.retryCount) {
                console.log(`API 호출 제한으로 인한 대기 중... (${retryAttempt + 1}/${this.retryCount})`);
                await this.sleep(this.retryDelay * (retryAttempt + 1));  // 점진적으로 대기 시간 증가
                return this.getKeywordStats(keyword, retryAttempt + 1);
            }
            
            console.log('검색량 조회 오류:', error.message);
            return null;
        }
    }
}

module.exports = NaverSearchAPI; 