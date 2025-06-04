import axios from 'axios';
import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';
import { headers, PAGE_ID } from './config.js';
import { createSubpageWithCallout } from './createSubpage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 페이지의 블록들을 가져와서 엑셀 파일로 저장하는 함수
 * @param {string} pageId - 페이지 ID
 * @param {string} outputPath - 엑셀 파일 저장 경로
 * @returns {Promise<boolean>} 성공 여부
 */
export async function getPageBlocks(pageId, outputPath) {
    const url = `https://api.notion.com/v1/blocks/${pageId}/children`;
    
    try {
        const response = await axios.get(url, { headers });
        const blocks = response.data.results;
        
        // 엑셀에 저장할 데이터를 담을 배열
        const blocksData = [];
        const currentTime = new Date().toISOString().replace('T', ' ').split('.')[0];
        
        for (const block of blocks) {
            const blockType = block.type || "unknown";
            const blockId = block.id || "unknown";
            const createdTime = block.created_time || "";
            const lastEditedTime = block.last_edited_time || "";
            
            // 텍스트 내용이 있는 경우 가져오기
            let content = "";
            if (blockType === "paragraph" && block.paragraph) {
                const richText = block.paragraph.rich_text || [];
                if (richText.length > 0) {
                    content = richText[0].text?.content || "";
                }
            }
            
            // 엑셀 데이터 추가
            blocksData.push({
                "조회 시간": currentTime,
                "블록 ID": blockId,
                "타입": blockType,
                "내용": content,
                "생성 시간": createdTime,
                "마지막 수정 시간": lastEditedTime
            });
        }
        
        // 현재 스크립트의 디렉토리 경로 가져오기
        const currentDir = __dirname;
        const excelFilename = "notion_blocks_history.xlsx";
        const excelPath = path.join(currentDir, excelFilename);
        
        console.log("\n엑셀 파일 저장을 시작합니다...");
        console.log(`저장 경로: ${excelPath}`);
        
        try {
            // 새로운 워크북 생성
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Blocks');
            
            // 컬럼 설정
            worksheet.columns = [
                { header: '조회 시간', key: '조회 시간', width: 20 },
                { header: '블록 ID', key: '블록 ID', width: 40 },
                { header: '타입', key: '타입', width: 15 },
                { header: '내용', key: '내용', width: 50 },
                { header: '생성 시간', key: '생성 시간', width: 20 },
                { header: '마지막 수정 시간', key: '마지막 수정 시간', width: 20 }
            ];
            
            // 데이터 추가
            worksheet.addRows(blocksData);
            
            // 파일 저장
            await workbook.xlsx.writeFile(excelPath);
            
            console.log(`\n블록 목록이 ${excelFilename} 파일에 저장되었습니다.`);
            console.log(`총 ${blocksData.length} 개의 블록이 저장되어 있습니다.`);
            
        } catch (error) {
            console.error("파일 저장 중 오류 발생:", error.message);
            throw error;
        }
        
        return blocks;
    } catch (error) {
        console.error("블록 조회 중 오류 발생:", error.response?.status);
        console.error(error.response?.data);
        return [];
    }
}

/**
 * 텍스트 블록을 추가하고 하위 페이지를 생성하는 함수
 * @param {string} parentId - 상위 페이지 ID
 * @param {string} text - 추가할 텍스트
 * @param {string} subpageTitle - 생성할 하위 페이지 제목
 * @returns {Promise<{textBlockId: string, subpageId: string}|null>} 생성된 블록과 페이지의 ID 또는 null
 */
export async function addTextBlockAndSubpage(parentId, text, subpageTitle) {
    // 먼저 텍스트 블록 추가
    console.log("\n새로운 블록 추가 중...");
    const url = `https://api.notion.com/v1/blocks/${parentId}/children`;
    
    const payload = {
        children: [
            {
                object: "block",
                type: "paragraph",
                paragraph: {
                    rich_text: [
                        {
                            type: "text",
                            text: {
                                content: text
                            }
                        }
                    ]
                }
            }
        ]
    };
    
    try {
        const response = await axios.patch(url, payload, { headers });
        if (response.status === 200) {
            console.log("텍스트 블록이 성공적으로 추가되었습니다.");
            
            // 하위 페이지 생성
            await createSubpageWithCallout(subpageTitle);
            
            return {
                textBlockId: response.data.results[0].id,
                subpageId: response.data.results[0].id
            };
        }
    } catch (error) {
        console.error("오류 발생:", error.response?.status);
        console.error(error.response?.data);
    }
    
    return null;
}

/**
 * 메인 실행 함수
 */
export async function main() {
    try {
        // 텍스트 블록 추가 및 하위 페이지 생성
        await addTextBlockAndSubpage(PAGE_ID, "테스트입니다", "테스트 하위 페이지");
        
        // 블록 정보 업데이트
        const blocks = await getPageBlocks(PAGE_ID, __dirname);
        if (!blocks.length) {
            console.log("블록 정보를 가져오는데 실패했습니다.");
        }
    } catch (error) {
        console.error("엑셀 파일 업데이트 중 오류 발생:", error.message);
    }
}

// 직접 실행될 때만 main 함수 실행
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    getPageBlocks,
    addTextBlockAndSubpage
}; 