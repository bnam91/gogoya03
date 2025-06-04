import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import { config } from '../config/config.js';

const uri = "mongodb+srv://coq3820:JmbIOcaEOrvkpQo1@cluster0.qj1ty.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const ITEMS_PER_PAGE = 20;

// MongoDB 클라이언트를 전역으로 관리
let client = null;

// MongoDB 클라이언트 연결 함수
export async function getMongoClient() {
    if (!client) {
        client = new MongoClient(uri, {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            },
            maxPoolSize: 10, // 최대 연결 풀 크기
            minPoolSize: 5,  // 최소 연결 풀 크기
            connectTimeoutMS: 10000, // 연결 타임아웃
            socketTimeoutMS: 45000,  // 소켓 타임아웃
            retryWrites: true,
            retryReads: true
        });
        await client.connect();
    }
    return client;
}

// 재시도 로직을 포함한 함수 실행
export async function withRetry(operation, maxRetries = 3, delay = 1000) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (i < maxRetries - 1) {
                console.log(`재시도 중... (${i + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
}

export async function getMongoData() {
    try {
        const client = new MongoClient(uri, {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            }
        });

        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("MongoDB 연결 성공!");

        const db = client.db(config.database.name);
        const collection = db.collection(config.database.collections.vendorBrandInfo);

        const data = await collection.find({}).toArray();
        await client.close();

        return data;
    } catch (error) {
        console.error('MongoDB 연결 오류:', error);
        throw error;
    }
}

export async function getBrandContactData(skip = 0, limit = 20, filters = {}) {
    return withRetry(async () => {
        const client = await getMongoClient();
        const db = client.db(config.database.name);
        const collection = db.collection(config.database.collections.mainItemTodayData);

        // 필터 쿼리 생성
        const query = {};

        // 브랜드명 검색 필터
        if (filters.searchQuery) {
            query.brand = {
                $regex: filters.searchQuery,
                $options: 'i'  // 대소문자 구분 없이 검색
            };
        }

        // 카테고리 필터
        if (filters.categories && filters.categories.length > 0) {
            query.item_category = { $in: filters.categories };
        }

        // 등급 필터
        if (filters.grades && filters.grades.length > 0) {
            query.grade = { $in: filters.grades };
        }

        // 인증 상태 필터
        if (filters.verificationStatus) {
            const brandInfoCollection = db.collection(config.database.collections.vendorBrandInfo);
            const brandInfoCursor = await brandInfoCollection.find(
                { is_verified: filters.verificationStatus },
                { projection: { brand_name: 1 } }
            );
            const brandInfos = await brandInfoCursor.toArray();
            const brandNamesWithVerification = brandInfos.map(info => info.brand_name);

            query.brand = { $in: brandNamesWithVerification };
        }

        // 브랜드 정보 유무 필터
        if (filters.hasBrandInfo !== null) {
            const brandInfoCollection = db.collection(config.database.collections.vendorBrandInfo);
            const brandInfoCursor = await brandInfoCollection.find({}, { projection: { brand_name: 1 } });
            const brandInfos = await brandInfoCursor.toArray();
            const brandNamesWithInfo = brandInfos.map(info => info.brand_name);

            if (filters.hasBrandInfo) {
                query.brand = { $in: brandNamesWithInfo };
            } else {
                query.brand = { $nin: brandNamesWithInfo };
            }
        }

        // 다음 단계 필터
        if (filters.nextSteps && filters.nextSteps.length > 0) {
            const callRecordsCollection = db.collection(config.database.collections.callRecords);
            const callRecordsCursor = await callRecordsCollection.find(
                { nextstep: { $in: filters.nextSteps } },
                { projection: { brand_name: 1 } }
            );
            const callRecords = await callRecordsCursor.toArray();
            const brandNamesWithNextStep = callRecords.map(record => record.brand_name);

            if (brandNamesWithNextStep.length > 0) {
                query.brand = { $in: brandNamesWithNextStep };
            } else {
                // 해당하는 다음 단계가 없는 경우 빈 결과를 반환
                query.brand = { $in: [] };
            }
        }

        // 필요한 필드만 프로젝션
        const cursor = collection.find(query, {
            projection: {
                _id: 1,
                NEW: 1,
                crawl_date: 1,
                brand: 1,
                item_category: 1,
                item: 1,
                author: 1,
                clean_name: 1,
                grade: 1,
                category: 1,
                item_feed_link: 1
            }
        })
            .sort([
                ['crawl_date', -1],  // 크롤링 날짜 기준 내림차순
                ['brand', 1],        // 브랜드명 기준 오름차순
                ['_id', 1]           // _id 기준 오름차순
            ])
            .skip(skip)
            .limit(limit);

        const data = await cursor.toArray();
        console.log('조회된 데이터 수:', data.length);

        const hasMore = data.length === limit;
        return { data, hasMore };
    });
}

export async function getBrandPhoneData(brandName) {
    return withRetry(async () => {
        const client = await getMongoClient();
        const db = client.db(config.database.name);
        const collection = db.collection(config.database.collections.vendorBrandInfo);
        return await collection.findOne({ brand_name: brandName });
    });
}

export async function saveCallRecord(callData) {
    return withRetry(async () => {
        const client = await getMongoClient();
        const db = client.db(config.database.name);
        const collection = db.collection(config.database.collections.callRecords);
        return await collection.insertOne(callData);
    });
}

export async function getCallRecords(brandName) {
    /*
    return withRetry(async () => {
        const client = await getMongoClient();
        const db = client.db(config.database.name);
        const collection = db.collection(config.database.collections.callRecords);
        return await collection.find({ brand_name: brandName })
            .sort({ call_date: -1 })
            .toArray();
    });
    */
    return withRetry(async () => {
        const client = await getMongoClient();
        const db = client.db(config.database.name);
        const collection = db.collection(config.database.collections.callRecords);

        const records = await collection.find({ brand_name: brandName })
            .sort({ call_date: -1 })
            .toArray();

        // _id를 문자열로 변환
        const convertedRecords = records.map(record => ({
            ...record,
            _id: record._id.toHexString()
        }));

        return convertedRecords;
    });
}

export async function getLatestCallRecordByCardId(cardId) {
    return withRetry(async () => {
        const client = await getMongoClient();
        const db = client.db(config.database.name);
        const collection = db.collection(config.database.collections.callRecords);

        const record = await collection.findOne(
            { card_id: cardId },
            { sort: { call_date: -1 } }
        );

        return record;
    });
}

export async function updateBrandInfo(brandName, updateData) {
    return withRetry(async () => {
        const client = await getMongoClient();
        const db = client.db(config.database.name);
        const collection = db.collection(config.database.collections.vendorBrandInfo);
        return await collection.updateOne(
            { brand_name: brandName },
            { $set: updateData }
        );
    });
}

export async function updateCallRecord(recordId, updateData) {
    console.log('updateCallRecord', recordId, updateData);
    return withRetry(async () => {
        const client = await getMongoClient();
        const db = client.db(config.database.name);
        const collection = db.collection(config.database.collections.callRecords);
        return await collection.updateOne(
            { _id: new ObjectId(recordId) },
            { $set: updateData }
        );
    });
}

export async function getCallRecordById(recordId) {
    return withRetry(async () => {
        const client = await getMongoClient();
        const db = client.db(config.database.name);
        const collection = db.collection(config.database.collections.callRecords);
        return await collection.findOne({ _id: new ObjectId(recordId) });
    });
}


export async function saveInfluencerTags(username, tags) {
    return withRetry(async () => {
        const client = await getMongoClient();
        const db = client.db('insta09_database');
        const collection = db.collection('02_main_influencer_data');
        return await collection.updateOne(
            { username: username },
            { $set: { tags: tags } }
        );
    });
}

export async function saveInfluencerContact(username, contactMethod, contactInfo, isExcluded, exclusionReason) {
    return withRetry(async () => {
        const client = await getMongoClient();
        const db = client.db('insta09_database');
        const collection = db.collection('02_main_influencer_data');
        return await collection.updateOne(
            { username: username },
            {
                $set: {
                    contact_method: contactMethod,
                    contact_info: contactInfo,
                    is_contact_excluded: isExcluded,
                    contact_exclusion_reason: exclusionReason
                }
            }
        );
    });
}

export async function updateNextStep(brandName, newStatus) {
    return withRetry(async () => {
        const client = await getMongoClient();
        const db = client.db(config.database.name);
        const collection = db.collection(config.database.collections.callRecords);

        return await collection.updateMany(
            { brand_name: brandName },
            { $set: { nextstep: newStatus } }
        );
    });
}  

export async function getInfluencerList() {
    return withRetry(async () => {
        const client = await getMongoClient();
        const db = client.db(config.database.name);
        const collection = db.collection(config.database.collections.influencerData);
        
        const data = await collection.find({}, {
            projection: {
                username: 1,
                clean_name: 1,
                _id: 0
            }
        }).limit(1).toArray();
        
        return data;
    });
}  

export async function getBrandWebsiteUrl(brandName) {
    return withRetry(async () => {
        const client = await getMongoClient();
        const db = client.db('insta09_database');
        const collection = db.collection('gogoya_vendor_brand_info');
        const result = await collection.findOne(
            { brand_name: brandName },
            { projection: { official_website_url: 1 } }
        );
        return result ? result.official_website_url : null;
    });
}  

export async function saveKeyword500Pick(categoryId, keyword, searchVolume) {
    return withRetry(async () => {
        const client = await getMongoClient();
        const db = client.db('insta09_database');
        const collection = db.collection('gogoya_keyword_Gold');
        
        const [firstCategory, secondCategory] = categoryId.split('_');
        
        const updateData = {
            keyword: keyword,
            category_id: categoryId,
            first_category: firstCategory,
            second_category: secondCategory,
            picked_date: new Date(),
            status: 'pick'
        };

        // 검색량이 있는 경우에만 추가
        if (searchVolume !== null) {
            updateData.search_volume = searchVolume;
            updateData.search_volume_updated_at = new Date();
        }
        
        return await collection.updateOne(
            { 
                keyword: keyword,
                category_id: categoryId
            },
            { 
                $set: updateData
            },
            { upsert: true }
        );
    });
}

export async function removeKeyword500Pick(categoryId, keyword) {
    return withRetry(async () => {
        const client = await getMongoClient();
        const db = client.db('insta09_database');
        const collection = db.collection('gogoya_keyword_Gold');
        
        return await collection.updateOne(
            { 
                keyword: keyword,
                category_id: categoryId
            },
            { 
                $set: {
                    status: 'none'
                }
            }
        );
    });
}  