import axios from 'axios';
import { headers } from '../config.js';

/**
 * 데이터베이스 속성의 순서를 변경하는 함수
 * @param {string} databaseId - 데이터베이스 ID
 * @returns {Promise<boolean>} 성공 여부
 */
export async function updateDatabasePropertiesOrder(databaseId) {
    const url = `https://api.notion.com/v1/databases/${databaseId}`;
    
    const payload = {
        properties: {
            "브랜드": {
                type: "title",
                title: {}
            },
            "item": {
                type: "rich_text",
                rich_text: {}
            },
            "URL": {
                type: "url",
                url: {}
            }
        }
    };
    
    try {
        const response = await axios.patch(url, payload, { headers });
        console.log("데이터베이스 속성 순서가 성공적으로 업데이트되었습니다.");
        return true;
    } catch (error) {
        console.error("데이터베이스 속성 순서 업데이트 실패:", error.response?.status);
        console.error(error.response?.data);
        return false;
    }
}

/**
 * 하위 페이지에 데이터베이스를 생성하는 함수
 * @param {string} parentId - 상위 페이지 ID
 * @returns {Promise<string|null>} 생성된 데이터베이스의 ID 또는 null (실패 시)
 */
export async function createDatabase(parentId) {
    const url = "https://api.notion.com/v1/databases";
    
    const payload = {
        parent: {
            type: "page_id",
            page_id: parentId
        },
        title: [
            {
                type: "text",
                text: {
                    content: "소싱 리스트"
                }
            }
        ],
        is_inline: true,
        properties: {
            "브랜드": {
                type: "title",
                title: {}
            },
            "item": {
                type: "rich_text",
                rich_text: {}
            },
            "URL": {
                type: "url",
                url: {}
            }
        }
    };
    
    const maxRetries = 3;
    const retryDelay = 1000; // 1초
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await axios.post(url, payload, { headers });
            const databaseId = response.data.id;
            console.log(`데이터베이스가 성공적으로 생성되었습니다. (ID: ${databaseId})`);
            
            // 데이터베이스 속성 순서 업데이트
            if (await updateDatabasePropertiesOrder(databaseId)) {
                console.log("데이터베이스 설정이 완료되었습니다.");
            } else {
                console.log("데이터베이스는 생성되었으나 속성 순서 변경에 실패했습니다.");
            }
            
            return databaseId;
        } catch (error) {
            if (error.response?.status === 409 && attempt < maxRetries - 1) {
                console.log(`데이터베이스 생성 시도 ${attempt + 1}/${maxRetries} 실패. 재시도 중...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                continue;
            }
            console.error("데이터베이스 생성 중 오류 발생:", error.response?.status);
            console.error(error.response?.data);
            return null;
        }
    }
    
    return null;
}

/**
 * 기존 데이터베이스를 복제하는 함수
 * @param {string} parentId - 새로운 데이터베이스가 생성될 페이지 ID
 * @param {string} sourceDatabaseId - 복사할 원본 데이터베이스 ID
 * @returns {Promise<string|null>} 생성된 데이터베이스의 ID 또는 null (실패 시)
 */
export async function duplicateDatabase(parentId, sourceDatabaseId = "1f6111a5778880d4b757d487033f182e") {
    const getUrl = `https://api.notion.com/v1/databases/${sourceDatabaseId}`;
    
    try {
        const getResponse = await axios.get(getUrl, { headers });
        const sourceDb = getResponse.data;
        
        // 원본 데이터베이스의 속성 정보 출력
        console.log("\n=== 원본 데이터베이스 속성 정보 ===");
        for (const [propName, propInfo] of Object.entries(sourceDb.properties)) {
            console.log(`속성명: ${propName}`);
            console.log(`타입: ${propInfo.type}`);
            console.log(`설정:`, propInfo);
            console.log("---");
        }
        
        // 새로운 데이터베이스 생성
        const createUrl = "https://api.notion.com/v1/databases";
        const createPayload = {
            parent: {
                type: "page_id",
                page_id: parentId
            },
            title: sourceDb.title,
            is_inline: true,
            properties: sourceDb.properties
        };
        
        console.log("\n=== 생성 요청 Payload ===");
        console.log(JSON.stringify(createPayload, null, 2));
        
        const createResponse = await axios.post(createUrl, createPayload, { headers });
        const databaseId = createResponse.data.id;
        
        // 생성된 데이터베이스의 속성 정보 출력
        console.log("\n=== 생성된 데이터베이스 속성 정보 ===");
        const createdDb = createResponse.data;
        for (const [propName, propInfo] of Object.entries(createdDb.properties)) {
            console.log(`속성명: ${propName}`);
            console.log(`타입: ${propInfo.type}`);
            console.log(`설정:`, propInfo);
            console.log("---");
        }
        
        console.log(`데이터베이스가 성공적으로 복제되었습니다. (ID: ${databaseId})`);
        return databaseId;
    } catch (error) {
        console.error("데이터베이스 복제 중 오류 발생:", error.response?.status);
        console.error(error.response?.data);
        return null;
    }
}

/**
 * 데이터베이스에 여러 아이템을 추가하는 함수
 * @param {string} databaseId - 데이터베이스 ID
 * @param {Array} items - 추가할 아이템 리스트
 * @returns {Promise<{success: boolean, total: number, successCount: number, failedItems: Array}>} 업로드 결과
 */
export async function addItemsToDatabase(databaseId, items) {
    const url = "https://api.notion.com/v1/pages";
    const result = {
        success: true,
        total: items.length,
        successCount: 0,
        failedItems: []
    };
    
    try {
        // 데이터베이스의 현재 속성 구조를 가져옴
        const dbUrl = `https://api.notion.com/v1/databases/${databaseId}`;
        const dbResponse = await axios.get(dbUrl, { headers });
        const dbProperties = dbResponse.data.properties;
        
        for (const item of items) {
            const properties = {};
            let hasValidData = false;
            
            // 각 속성에 대해 적절한 형식으로 데이터를 변환
            for (const [propName, propInfo] of Object.entries(dbProperties)) {
                const propType = propInfo.type;
                
                // JSON 데이터의 키 이름과 데이터베이스 속성 이름이 다를 수 있으므로 매핑
                const jsonKey = propName === "아이템" ? "item" : propName;
                
                if (!(jsonKey in item)) continue;
                
                const value = item[jsonKey];
                if (value && value !== '-') {
                    hasValidData = true;
                }
                
                switch (propType) {
                    case "title":
                        properties[propName] = {
                            title: [{ text: { content: String(value || '') } }]
                        };
                        break;
                    case "rich_text":
                        properties[propName] = {
                            rich_text: [{ text: { content: String(value || '') } }]
                        };
                        break;
                    case "url":
                        properties[propName] = { url: value || null };
                        break;
                    case "select":
                        properties[propName] = { select: { name: String(value || '') } };
                        break;
                    case "multi_select":
                        if (Array.isArray(value)) {
                            properties[propName] = {
                                multi_select: value.map(v => ({ name: String(v) }))
                            };
                        } else {
                            properties[propName] = {
                                multi_select: [{ name: String(value || '') }]
                            };
                        }
                        break;
                }
            }
            
            // 유효한 데이터가 없는 경우 건너뛰기
            if (!hasValidData) {
                console.log(`유효한 데이터가 없는 아이템 건너뛰기: ${JSON.stringify(item)}`);
                result.failedItems.push({
                    item,
                    reason: "유효한 데이터 없음"
                });
                continue;
            }
            
            const payload = {
                parent: { database_id: databaseId },
                properties
            };
            
            try {
                await axios.post(url, payload, { headers });
                console.log(`아이템 추가 성공: ${item["1.브랜드"] || ''} - ${item["2.아이템"] || ''}`);
                result.successCount++;
                
                // API 속도 제한을 피하기 위한 대기
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.error(`아이템 추가 실패: ${item["1.브랜드"] || ''} - ${item["2.아이템"] || ''}`);
                console.error("오류 코드:", error.response?.status);
                console.error(error.response?.data);
                result.success = false;
                result.failedItems.push({
                    item,
                    reason: error.response?.data?.message || "알 수 없는 오류"
                });
            }
        }
        
        // 전체 성공 여부 결정 (모든 아이템이 성공해야 true)
        result.success = result.successCount === result.total;
        
        return result;
    } catch (error) {
        console.error("데이터베이스 정보 가져오기 중 오류 발생:", error.response?.status);
        console.error(error.response?.data);
        return {
            success: false,
            total: items.length,
            successCount: 0,
            failedItems: items.map(item => ({
                item,
                reason: "데이터베이스 접근 오류"
            }))
        };
    }
}

/**
 * 페이지의 공유 링크를 가져오는 함수
 * @param {string} pageId - 페이지 ID
 * @returns {Promise<string|null>} 페이지의 공유 링크
 */
export async function getPageUrl(pageId) {
    const url = `https://api.notion.com/v1/pages/${pageId}`;
    
    try {
        const response = await axios.get(url, { headers });
        const pageUrl = response.data.url;
        console.log(`페이지 공유 링크: ${pageUrl}`);
        return pageUrl;
    } catch (error) {
        console.error("페이지 정보 가져오기 실패:", error.response?.status);
        console.error(error.response?.data);
        return null;
    }
}

/**
 * 페이지 제목으로 페이지를 검색하는 함수
 * @param {string} baseTitle - 검색할 페이지의 기본 제목 (날짜 제외)
 * @returns {Promise<string|null>} 페이지 ID 또는 null (찾지 못한 경우)
 */
export async function searchPageByTitle(baseTitle) {
    const url = "https://api.notion.com/v1/search";
    const payload = {
        query: baseTitle,
        filter: {
            property: "object",
            value: "page"
        }
    };

    try {
        const response = await axios.post(url, payload, { headers });
        const pages = response.data.results;
        
        // 기본 제목으로 시작하는 페이지 찾기
        const matchingPage = pages.find(page => {
            const pageTitle = page.properties.title?.title[0]?.plain_text;
            return pageTitle && pageTitle.startsWith(baseTitle);
        });

        if (matchingPage) {
            const pageTitle = matchingPage.properties.title?.title[0]?.plain_text;
            console.log(`기존 페이지를 찾았습니다. (제목: ${pageTitle}, ID: ${matchingPage.id})`);
            return matchingPage.id;
        }
        
        console.log(`'${baseTitle}'로 시작하는 페이지를 찾지 못했습니다.`);
        return null;
    } catch (error) {
        console.error("페이지 검색 중 오류 발생:", error.response?.status);
        console.error(error.response?.data);
        return null;
    }
}

/**
 * 페이지의 모든 데이터베이스 블록을 삭제하는 함수
 * @param {string} pageId - 페이지 ID
 * @returns {Promise<boolean>} 성공 여부
 */
export async function deleteDatabaseBlocks(pageId) {
    const url = `https://api.notion.com/v1/blocks/${pageId}/children`;
    
    try {
        // 페이지의 모든 블록 가져오기
        const response = await axios.get(url, { headers });
        const blocks = response.data.results;
        
        // 데이터베이스 블록과 그 위의 빈 블록 찾기
        const blocksToDelete = [];
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            if (block.type === "child_database") {
                // 데이터베이스 블록 위의 빈 블록 확인
                if (i > 0 && blocks[i-1].type === "paragraph" && 
                    (!blocks[i-1].paragraph.rich_text || blocks[i-1].paragraph.rich_text.length === 0)) {
                    blocksToDelete.push(blocks[i-1].id);
                }
                blocksToDelete.push(block.id);
            }
        }
        
        if (blocksToDelete.length === 0) {
            console.log("삭제할 블록이 없습니다.");
            return true;
        }

        // 각 블록 삭제
        for (const blockId of blocksToDelete) {
            const deleteUrl = `https://api.notion.com/v1/blocks/${blockId}`;
            await axios.delete(deleteUrl, { headers });
            console.log(`블록 삭제 완료 (ID: ${blockId})`);
        }
        
        return true;
    } catch (error) {
        console.error("블록 삭제 중 오류 발생:", error.response?.status);
        console.error(error.response?.data);
        return false;
    }
}

/**
 * 페이지 제목을 업데이트하는 함수
 * @param {string} pageId - 페이지 ID
 * @param {string} newTitle - 새로운 제목
 * @returns {Promise<boolean>} 성공 여부
 */
export async function updatePageTitle(pageId, newTitle) {
    const url = `https://api.notion.com/v1/pages/${pageId}`;
    const payload = {
        properties: {
            title: {
                title: [
                    {
                        text: {
                            content: newTitle
                        }
                    }
                ]
            }
        }
    };

    try {
        await axios.patch(url, payload, { headers });
        console.log(`페이지 제목이 업데이트되었습니다: ${newTitle}`);
        return true;
    } catch (error) {
        console.error("페이지 제목 업데이트 중 오류 발생:", error.response?.status);
        console.error(error.response?.data);
        return false;
    }
} 