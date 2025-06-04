// Notion API 설정
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env 파일의 상대 경로 지정
const envPath = '../../../../../../.env';

console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

const NOTION_API_KEY = process.env.NOTION_API_KEY;
if (!NOTION_API_KEY) {
    throw new Error("NOTION_API_KEY가 설정되지 않았습니다. .env 파일을 확인해주세요.");
}

const PAGE_ID = "1f6111a5778880e3bd03cd0a2bae843b";  // 페이지 ID
const DATABASE_ID = "1f6111a5778880e3bd03cd0a2bae843b";  // 데이터베이스 ID

const headers = {
    "Authorization": `Bearer ${NOTION_API_KEY}`,
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28"
};

export {
    headers,
    PAGE_ID,
    DATABASE_ID,
    __dirname
}; 