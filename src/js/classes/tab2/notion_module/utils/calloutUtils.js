import axios from 'axios';
import { headers } from '../config.js';

/**
 * 블록의 하위 블록들을 가져오는 함수
 * @param {string} blockId - 블록 ID
 * @returns {Promise<Array>} 하위 블록 목록
 */
async function getBlockChildren(blockId) {
    const url = `https://api.notion.com/v1/blocks/${blockId}/children`;
    try {
        const response = await axios.get(url, { headers });
        return response.data.results;
    } catch (error) {
        console.error("블록 하위 항목 가져오기 실패:", error.response?.status);
        console.error(error.response?.data);
        return [];
    }
}

/**
 * 특정 ID의 콜아웃 블록을 찾는 함수
 * @param {Array} blocks - 블록 목록
 * @param {string} targetId - 찾을 콜아웃 블록의 ID
 * @returns {Promise<Object|null>} 콜아웃 블록 정보 또는 null
 */
async function findCalloutBlock(blocks, targetId = "1f6111a5-7788-80b8-8ab2-faf5d9fab77c") {
    for (const block of blocks) {
        if (block.type === "callout" && block.id === targetId) {
            // 콜아웃 블록의 하위 블록들 가져오기
            const children = await getBlockChildren(targetId);
            
            return {
                children,
                icon: block.callout?.icon || { type: "emoji", emoji: "⚠️" },
                color: block.callout?.color || "gray_background",
                rich_text: block.callout?.rich_text || []
            };
        }
    }
    return null;
}

/**
 * 콜아웃이 있는 페이지를 생성하는 함수
 * @param {string} parentId - 상위 페이지 ID
 * @param {string} title - 페이지 제목
 * @param {Object} calloutData - 콜아웃 데이터
 * @returns {Promise<string|null>} 생성된 페이지 ID 또는 null
 */
async function createPageWithCallout(parentId, title, calloutData) {
    const url = "https://api.notion.com/v1/pages";
    
    const payload = {
        parent: {
            page_id: parentId
        },
        properties: {
            title: {
                title: [
                    {
                        text: {
                            content: title
                        }
                    }
                ]
            }
        }
    };
    
    const maxRetries = 3;
    const retryDelay = 1000; // 1초
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await axios.post(url, payload, { headers });
            const pageId = response.data.id;
            
            // 페이지 생성 후 잠시 대기
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            
            // 콜아웃 블록 추가
            const calloutUrl = `https://api.notion.com/v1/blocks/${pageId}/children`;
            
            // 기본 콜아웃 블록 생성
            const calloutBlock = {
                object: "block",
                type: "callout",
                callout: {
                    rich_text: [],
                    icon: calloutData.icon,
                    color: calloutData.color
                }
            };
            
            // 첫 번째 heading_3 블록의 내용을 찾아서 콜아웃의 rich_text로 사용
            const remainingChildren = [];
            if (calloutData.children) {
                for (const child of calloutData.children) {
                    if (child.type === "heading_3" && !calloutBlock.callout.rich_text.length) {
                        // heading_3의 내용과 서식 정보를 그대로 콜아웃의 rich_text로 사용
                        const headingBlock = child[child.type];
                        
                        // rich_text는 그대로 복사
                        calloutBlock.callout.rich_text = headingBlock.rich_text;
                        
                        // 제목 서식 유지를 위해 지원되는 속성만 사용
                        for (const textItem of calloutBlock.callout.rich_text) {
                            // 기존 annotations 유지하면서 텍스트를 굵게만 설정
                            if (textItem.annotations) {
                                textItem.annotations.bold = true; // 제목 효과를 내기 위해 굵게 설정
                            }
                        }
                        
                        // 배경색 gray_background 유지
                        calloutBlock.callout.color = "gray_background";
                    } else {
                        remainingChildren.push(child);
                    }
                }
            }
            
            const calloutPayload = {
                children: [calloutBlock]
            };
            
            // 콜아웃 블록 추가
            const calloutResponse = await axios.patch(calloutUrl, calloutPayload, { headers });
            if (calloutResponse.status === 200) {
                // 콜아웃 블록의 ID 가져오기
                const calloutId = calloutResponse.data.results[0].id;
                
                // 잠시 대기
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                
                // 콜아웃 블록의 하위 블록으로 내용 추가 (heading_3 제외)
                const childrenUrl = `https://api.notion.com/v1/blocks/${calloutId}/children`;
                
                // 하위 블록들 생성 (heading_3 제외)
                const childrenBlocks = remainingChildren.map(child => {
                    // 필요한 속성만 복사
                    const newBlock = {
                        object: "block",
                        type: child.type
                    };
                    
                    // 블록 타입에 따라 적절한 속성 복사 (서식 정보 포함)
                    const blockType = child.type;
                    if (["paragraph", "heading_1", "heading_2", "heading_3", 
                         "bulleted_list_item", "numbered_list_item", "to_do", 
                         "toggle", "code"].includes(blockType)) {
                        // 원본 블록의 모든 속성을 그대로 복사
                        newBlock[blockType] = { ...child[blockType] };
                        
                        // to_do 타입의 경우 checked 속성도 복사
                        if (blockType === "to_do") {
                            newBlock[blockType].checked = child[blockType].checked;
                        }
                        
                        // code 타입의 경우 language 속성도 복사
                        if (blockType === "code") {
                            newBlock[blockType].language = child[blockType].language;
                        }
                    }
                    
                    return newBlock;
                });
                
                // 하위 블록 추가
                const childrenPayload = {
                    children: childrenBlocks
                };
                
                // 하위 블록 추가 시도
                for (let childrenAttempt = 0; childrenAttempt < maxRetries; childrenAttempt++) {
                    try {
                        const childrenResponse = await axios.patch(childrenUrl, childrenPayload, { headers });
                        if (childrenResponse.status === 200) {
                            return pageId;
                        }
                    } catch (error) {
                        if (error.response?.status === 409 && childrenAttempt < maxRetries - 1) {
                            await new Promise(resolve => setTimeout(resolve, retryDelay));
                            continue;
                        }
                        console.error("하위 블록 추가 중 오류 발생:", error.response?.status);
                        console.error(error.response?.data);
                        break;
                    }
                }
                
                return pageId;
            }
        } catch (error) {
            if (error.response?.status === 409 && attempt < maxRetries - 1) {
                console.log(`페이지 생성 시도 ${attempt + 1}/${maxRetries} 실패. 재시도 중...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                continue;
            }
            console.error("페이지 생성 중 오류 발생:", error.response?.status);
            console.error(error.response?.data);
            return null;
        }
    }
    
    return null;
}

export {
    getBlockChildren,
    findCalloutBlock,
    createPageWithCallout
}; 