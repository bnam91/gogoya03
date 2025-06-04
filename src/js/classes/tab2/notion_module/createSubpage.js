import axios from 'axios';
import { headers, PAGE_ID } from './config.js';
import utils from './utils/index.js';

const {
    duplicateDatabase,
    addItemsToDatabase,
    getPageUrl,
    getBlockChildren,
    findCalloutBlock,
    createPageWithCallout,
    searchPageByTitle,
    deleteDatabaseBlocks,
    updatePageTitle
} = utils;

/**
 * 콜아웃 블록을 찾아서 하위 페이지를 생성하고 데이터베이스를 추가하는 함수
 * @param {string} cleanName - 인플루언서의 clean_name
 * @param {string} targetId - 찾을 콜아웃 블록의 ID
 * @returns {Promise<[string|null, string|null, string|null]>} [하위 페이지 ID, 데이터베이스 ID, 페이지 공유 링크] 또는 [null, null, null] (실패 시)
 */
async function createSubpageWithCallout(cleanName, targetId = "1f6111a5-7788-80b8-8ab2-faf5d9fab77c") {
    // 현재 날짜를 YYMMDD 형식으로 가져오기
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    // 기본 제목과 전체 제목 생성
    const baseTitle = `${cleanName}_전용리스트`;
    const subpageTitle = `${baseTitle}_${dateStr}`;
    
    try {
        // 기존 페이지 검색 (기본 제목으로만 검색)
        console.log(`\n기존 페이지 검색 중: ${baseTitle}`);
        const existingPageId = await searchPageByTitle(baseTitle);
        
        if (existingPageId) {
            console.log("기존 페이지의 데이터베이스 블록을 삭제합니다...");
            if (await deleteDatabaseBlocks(existingPageId)) {
                console.log("데이터베이스 블록 삭제 완료");
                
                // 페이지 제목 업데이트
                console.log("페이지 제목을 새로운 날짜로 업데이트합니다...");
                if (await updatePageTitle(existingPageId, subpageTitle)) {
                    // 새로운 데이터베이스 생성
                    const databaseId = await duplicateDatabase(existingPageId);
                    if (databaseId) {
                        console.log("새로운 데이터베이스가 성공적으로 생성되었습니다.");
                        
                        // 페이지 공유 링크 가져오기
                        let pageUrl = await getPageUrl(existingPageId);
                        if (!pageUrl) {
                            // URL을 가져오지 못한 경우 기본 URL 형식으로 생성
                            pageUrl = `https://www.notion.so/${subpageTitle.replace(/\s+/g, '-')}-${existingPageId.replace(/-/g, '')}`;
                        }
                        console.log(`페이지 공유 링크: ${pageUrl}`);
                        
                        return { 
                            pageId: existingPageId, 
                            dbId: databaseId,
                            pageUrl: pageUrl
                        };
                    } else {
                        throw new Error("데이터베이스 생성 실패");
                    }
                } else {
                    throw new Error("페이지 제목 업데이트 실패");
                }
            } else {
                throw new Error("기존 데이터베이스 블록 삭제 실패");
            }
        }
        
        // 현재 페이지의 블록들을 가져옴
        console.log("\n1. 블록 정보를 가져오는 중...");
        const url = `https://api.notion.com/v1/blocks/${PAGE_ID}/children`;
        
        console.log("2. API 호출 시작...");
        const response = await axios.get(url, { headers });
        console.log("3. API 응답 받음");
        const blocks = response.data.results;
        
        // 특정 ID의 callout 블록 찾기
        console.log(`\n4. 찾으려는 블록 ID: ${targetId}`);
        const calloutData = await findCalloutBlock(blocks, targetId);
        if (!calloutData) {
            console.log(`\nID가 ${targetId}인 callout 블록을 찾을 수 없습니다.`);
            console.log("\n현재 페이지의 블록 ID 목록:");
            for (const block of blocks) {
                console.log(`ID: ${block.id}, 타입: ${block.type}`);
            }
            throw new Error("콜아웃 블록을 찾을 수 없습니다");
        }
        
        // 하위 페이지 생성 (callout 내용과 서식 복제)
        const subpageId = await createPageWithCallout(PAGE_ID, subpageTitle, calloutData);
        if (!subpageId) {
            throw new Error("하위 페이지 생성 실패");
        }
        
        console.log(`하위 페이지가 성공적으로 생성되었습니다. (제목: ${subpageTitle}, ID: ${subpageId})`);
        
        // 페이지 공유 링크 가져오기
        let pageUrl = await getPageUrl(subpageId);
        if (!pageUrl) {
            // URL을 가져오지 못한 경우 기본 URL 형식으로 생성
            pageUrl = `https://www.notion.so/${subpageTitle.replace(/\s+/g, '-')}-${subpageId.replace(/-/g, '')}`;
        }
        console.log(`페이지 공유 링크: ${pageUrl}`);
        
        // 새로운 페이지 생성 시에만 빈 블록 추가
        const emptyBlockUrl = `https://api.notion.com/v1/blocks/${subpageId}/children`;
        const emptyBlockPayload = {
            children: [
                {
                    object: "block",
                    type: "paragraph",
                    paragraph: {
                        rich_text: []
                    }
                }
            ]
        };
        
        try {
            await axios.patch(emptyBlockUrl, emptyBlockPayload, { headers });
            console.log("새 페이지에 빈 블록이 추가되었습니다.");
        } catch (error) {
            console.error("빈 블록 추가 중 오류 발생:", error.response?.status);
            console.error(error.response?.data);
            // 빈 블록 추가 실패는 치명적이지 않으므로 계속 진행
        }
        
        // 데이터베이스 복제
        const databaseId = await duplicateDatabase(subpageId);
        if (!databaseId) {
            throw new Error("데이터베이스 복제 실패");
        }
        
        console.log(`데이터베이스가 성공적으로 복제되었습니다. (ID: ${databaseId})`);
        
        // 결과 객체에 pageUrl 포함하여 반환
        const result = {
            pageId: subpageId,
            dbId: databaseId,
            pageUrl: pageUrl
        };
        
        return result;
        
    } catch (error) {
        console.error("서브페이지 생성 중 오류 발생:", error.message);
        if (error.response) {
            console.error("API 응답 상태:", error.response.status);
            console.error("API 응답 데이터:", error.response.data);
        }
        return { pageId: null, dbId: null, pageUrl: null };
    }
}

/**
 * 메인 실행 함수
 */
async function main() {
    // 하위 페이지와 데이터베이스 생성
    const [pageId, dbId, pageUrl] = await createSubpageWithCallout("재단공주");
    
    if (pageId && dbId && pageUrl) {
        try {
            // 하드코딩된 더미 데이터 (새로운 칼럼명 적용)
            const sourcingData = {
                data: [
                    {
                        "1.브랜드": "나이키",
                        "2.아이템": "에어맥스 270 (운동화)",
                        "3.링크": "https://www.nike.com/kr/t/air-max-270-mens-shoes-KkLcGR"
                    },
                    {
                        "1.브랜드": "아디다스",
                        "2.아이템": "울트라부스트 22 (운동화)",
                        "3.링크": "https://www.adidas.co.kr/ultraboost-22-shoes"
                    },
                    {
                        "1.브랜드": "뉴발란스",
                        "2.아이템": "327 클래식 (운동화)",
                        "3.링크": "https://www.newbalance.co.kr/product/detail.html"
                    }
                ]
            };
            
            // 데이터베이스에 아이템 추가
            await addItemsToDatabase(dbId, sourcingData.data);
            console.log("모든 작업이 성공적으로 완료되었습니다.");
        } catch (error) {
            console.error("데이터 추가 중 오류 발생:", error.message);
        }
    } else {
        console.log("페이지 또는 데이터베이스 생성에 실패했습니다.");
    }
}

// 직접 실행될 때만 main 함수 실행
const currentFile = new URL(import.meta.url).pathname;
const targetFile = new URL(`file://${process.argv[1]}`).pathname;

console.log('currentFile:', currentFile);
console.log('targetFile:', targetFile);

if (currentFile === targetFile) {
    console.log('main 함수 실행 시작');
    main().catch(console.error);
} else {
    console.log('main 함수가 실행되지 않음');
}

export {
    createSubpageWithCallout
}; 