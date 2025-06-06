import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

// MongoDB 연결 설정
const uri = "mongodb+srv://coq3820:JmbIOcaEOrvkpQo1@cluster0.qj1ty.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri, {
    connectTimeoutMS: 60000,
    socketTimeoutMS: 60000
});

let db;
let influencerCollection;
let feedCollection;

// MongoDB 연결 함수
async function connectToMongo() {
    try {
        await client.connect();
        console.log("MongoDB 연결 성공!");
        
        db = client.db('insta09_database');
        influencerCollection = db.collection('02_main_influencer_data');
        feedCollection = db.collection('01_main_newfeed_crawl_data');
    } catch (e) {
        console.error("MongoDB 연결 실패:", e);
        process.exit(1);
    }
}

// 인플루언서 username 찾기 함수
async function findInfluencerUsername(searchName) {
    try {
        // username으로 검색
        let influencer = await influencerCollection.findOne({ username: searchName });
        if (influencer) {
            return influencer.username;
        }
        
        // clean_name으로 검색
        influencer = await influencerCollection.findOne({ clean_name: searchName });
        if (influencer) {
            return influencer.username;
        }
        
        return null;
    } catch (e) {
        console.error("인플루언서 검색 중 오류:", e);
        return null;
    }
}

// 키워드 하이라이트 함수
function highlightKeyword(text, keyword) {
    if (!text || !keyword) {
        return text;
    }
    
    const startIdx = text.toLowerCase().indexOf(keyword.toLowerCase());
    if (startIdx === -1) {
        return text;
    }
    
    const contextStart = Math.max(0, startIdx - 50);
    const contextEnd = Math.min(text.length, startIdx + keyword.length + 50);
    
    let context = text.slice(contextStart, contextEnd);
    
    const highlighted = context.replace(
        text.slice(startIdx, startIdx + keyword.length),
        `【${text.slice(startIdx, startIdx + keyword.length)}】`
    );
    
    let result = highlighted;
    if (contextStart > 0) {
        result = "..." + result;
    }
    if (contextEnd < text.length) {
        result = result + "...";
    }
    
    return result;
}

// 컨텐츠 검색 함수
async function searchContentByAuthorAndKeyword(searchName, searchKeyword) {
    try {
        const username = await findInfluencerUsername(searchName);
        if (!username) {
            console.log(`\n입력하신 '${searchName}'에 해당하는 인플루언서를 찾을 수 없습니다.`);
            return [];
        }
        
        console.log(`\n인플루언서 username: ${username}`);
        
        const totalPosts = await feedCollection.countDocuments({ author: username });
        console.log(`해당 작성자의 전체 게시물 수: ${totalPosts}개`);
        
        const query = {
            author: username,
            content: { $regex: searchKeyword, $options: 'i' }
        };
        
        const projection = {
            post_url: 1,
            cr_at: 1,
            content: 1,
            '09_brand': 1,
            '09_item': 1,
            _id: 0
        };
        
        const results = await feedCollection.find(query, { projection }).toArray();
        return results;
    } catch (e) {
        console.error("검색 중 오류 발생:", e);
        return [];
    }
}

// 메인 실행 함수
async function main() {
    await connectToMongo();
    
    console.log("\n=== 인스타그램 게시물 검색 ===");
    const searchName = process.argv[2];
    const keyword = process.argv[3];
    
    if (!searchName || !keyword) {
        console.log("인플루언서 이름과 검색 키워드를 모두 입력해주세요.");
        process.exit(1);
    }
    
    console.log(`\n검색 중... (인플루언서: ${searchName}, 키워드: ${keyword})`);
    const searchResults = await searchContentByAuthorAndKeyword(searchName, keyword);
    
    if (searchResults.length > 0) {
        console.log(`\n검색 결과: ${searchResults.length}개의 게시물을 찾았습니다.`);
        searchResults.forEach(result => {
            console.log(`게시물 URL: ${result.post_url}`);
            console.log(`작성 시간: ${result.cr_at}`);
            console.log(`브랜드: ${result['09_brand'] || '정보 없음'}`);
            console.log(`아이템: ${result['09_item'] || '정보 없음'}`);
            console.log(`내용: ${highlightKeyword(result.content || '내용 없음', keyword)}`);
            console.log("-".repeat(50));
        });
    } else {
        console.log("검색 결과가 없습니다.");
    }
    
    await client.close();
}

// 스크립트가 직접 실행될 때만 main 함수 실행
if (import.meta.url === new URL(import.meta.url).href) {
    main().catch(console.error);
}

export {
    findInfluencerUsername,
    searchContentByAuthorAndKeyword,
    highlightKeyword
}; 