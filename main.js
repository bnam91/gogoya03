/*
메인 프로세스 파일
*/
import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import updater from 'electron-updater';
import ReleaseUpdater from './release_updater.js';
import path from 'path';
const { autoUpdater } = updater;
import {
    getBrandContactData, getBrandPhoneData, saveCallRecord,
    getCallRecords, getLatestCallRecordByCardId, updateBrandInfo,
    updateCallRecord, getCallRecordById, getMongoClient, updateNextStep,
    saveKeyword500Pick, removeKeyword500Pick
} from './src/js/databases/mongo.js'; // Electron Main 프로세스에서 연결
import { fileURLToPath } from 'url';
import { makeCall, endCall } from './src/js/utils/phone.js';
//const fs = require('fs');
import fs from 'fs';
import { config } from './src/js/config/config.js';
import os from 'os';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { getGmailAuthUrl } from './src/gmailAuth.js';
import { smtpAuth } from './token/smtpAuth.js';
import nodemailer from 'nodemailer';
import xlsx from 'xlsx';
import puppeteer from 'puppeteer';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import { createSubpageWithCallout } from './src/js/classes/tab2/notion_module/createSubpage.js';
let authInstance; // 전역에 저장
// 인코딩 설정
process.env.CHARSET = 'UTF-8';
process.env.LANG = 'ko_KR.UTF-8';

let mainWindow;

// 자동 업데이트 설정
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

// 환경 변수에서 GitHub 정보 가져오기
const owner = process.env.GITHUB_OWNER || 'bnam91';
const repo = process.env.GITHUB_REPO || 'gogoya03';

// 개발 모드 확인
const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
console.log('현재 모드:', isDev ? '개발 모드' : '프로덕션 모드');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('실행 경로:', process.execPath);

// __dirname 직접 생성
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


//버전 파싱
const versionFile = path.join(__dirname, 'VERSION.txt');
const versionData = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
const tagName = versionData.tag_name;

// ===========================================
// ipcMain 핸들러 등록
// 렌더러 프로세스가 'brand-contact-data-request'라는 채널로 요청할 때
// MongoDB 데이터 조회 후 응답을 돌려준다
// ===========================================
ipcMain.handle('brand-contact-data-request', async (event, filters) => {

    try {
        const { skip = 0, limit = 20, ...otherFilters } = filters;
        const result = await getBrandContactData(skip, limit, otherFilters);
        return result;
    } catch (error) {
        console.error('brand-contact-data-request 처리 중 오류 발생:', error);
        throw error;
    }
});
ipcMain.handle('brand-phone-data-request', async (event, brandName) => {
    return await getBrandPhoneData(brandName);
});

ipcMain.handle('latest-call-record-request', async (event, cardId) => {
    return await getLatestCallRecordByCardId(cardId);
});

ipcMain.handle('call-record-by-id-request', async (event, recordId) => {
    return await getCallRecordById(recordId);
});

ipcMain.handle('save-call-record-request', async (event, callRecord) => {
    return await saveCallRecord(callRecord);
});

ipcMain.handle('update-brand-info-request', async (event, brandName, updateData) => {
    return await updateBrandInfo(brandName, updateData);
});

ipcMain.handle('update-card-next-step-request', async (event, recordId, newNextStep) => {
    return await updateCardNextStep(recordId, newNextStep);
});

ipcMain.handle('update-call-record-request', async (event, recordId, updateData) => {

    if (!recordId) {
        throw new Error('❌ recordId가 없습니다!');
    }

    return await updateCallRecord(recordId, updateData);
});

ipcMain.handle('fetch-call-records-request', async (event, brandName) => {
    return await getCallRecords(brandName);
});


ipcMain.handle('call-phone-request', async (event, phoneNumber) => {
    try {
        const result = await makeCall(phoneNumber);
        return result;
    } catch (error) {
        console.error('전화 연결 실패:', error);
        throw error;
    }
});

ipcMain.handle('end-call-request', async (event) => {
    try {
        const result = await endCall();
        return result;
    } catch (error) {
        console.error('전화 종료 실패:', error);
        throw error;
    }
});

ipcMain.handle('dashboard-proposal-request', async () => {
    try {
        const client = await getMongoClient();
        const db = client.db(config.database.name);
        const collection = db.collection(config.database.collections.callRecords);

        const proposalRequests = await collection.find({ nextstep: "제안서 요청" }).toArray();
        return proposalRequests;
    } catch (error) {
        console.error('Dashboard proposal data fetch error:', error);
        throw error;
    }
});

ipcMain.handle('fetch-brand-email-request', async (event, brandName) => {
    const client = await getMongoClient();
    const db = client.db(config.database.name);
    const collection = db.collection(config.database.collections.vendorBrandInfo);
    const brandInfo = await collection.findOne({ brand_name: brandName });
    return brandInfo?.email || '';
});

ipcMain.handle('update-nextstep-request', async (event, brandName, newStatus) => {
    try {
        const result = await updateNextStep(brandName, newStatus);
        return result;
    } catch (error) {
        console.error('updateNextStep 에러:', error);
        throw error;
    }
});

// 브랜드 정보 생성 핸들러
ipcMain.handle('create-brand-info', async (event, brandData) => {
    try {
        const client = await getMongoClient();
        const db = client.db(config.database.name);
        const collection = db.collection(config.database.collections.vendorBrandInfo);
        
        const result = await collection.insertOne(brandData);
        return result;
    } catch (error) {
        console.error('브랜드 정보 생성 중 오류:', error);
        throw error;
    }
});

// 셀러매칭 탭 인플루언서 데이터 조회
ipcMain.handle('fetch-influencer-data-for-seller-match', async () => {
    try {
        const client = await getMongoClient();
        const db = client.db(config.database.name);
        const collection = db.collection(config.database.collections.influencerData);

        const pipeline = [
            {
                "$match": {
                    "reels_views(15)": { "$exists": true, "$ne": "" },
                    "is_contact_excluded": { "$ne": true }
                }
            },
            {
                "$addFields": {
                    "reels_views_num": {
                        "$cond": {
                            "if": { "$eq": ["$reels_views(15)", "-"] },
                            "then": 0,
                            "else": { "$toInt": "$reels_views(15)" }
                        }
                    }
                }
            },
            {
                "$sort": { "reels_views_num": -1 }
            },
            {
                "$project": {
                    "username": 1,
                    "clean_name": 1,
                    "bio": 1,
                    "category": 1,
                    "followers": 1,
                    "following": 1,
                    "posts": 1,
                    "profile_link": 1,
                    "out_link": 1,
                    "image_url": 1,
                    "reels_views": "$reels_views(15)",
                    "reels_views_num": 1,
                    "contact_method": 1,
                    "brand": 1
                }
            }
        ];

        const results = await collection.aggregate(pipeline).toArray();
        return results;
    } catch (error) {
        console.error("📦 인플루언서 데이터 fetch 실패:", error);
        throw error;
    }
});

// 셀러분석 탭 인플루언서 데이터 조회
ipcMain.handle('fetch-influencer-data-for-seller-analysis', async () => {
    try {
        const client = await getMongoClient();
        const db = client.db(config.database.name);
        const collection = db.collection(config.database.collections.influencerData);

        const pipeline = [
            {
                "$match": {
                    "reels_views(15)": { "$exists": true, "$ne": "" }
                }
            },
            {
                "$addFields": {
                    "reels_views_num": {
                        "$cond": {
                            "if": { "$eq": ["$reels_views(15)", "-"] },
                            "then": 0,
                            "else": { "$toInt": "$reels_views(15)" }
                        }
                    },
                    "followers_num": {
                        "$cond": {
                            "if": { "$eq": ["$followers", "-"] },
                            "then": 0,
                            "else": { "$toInt": "$followers" }
                        }
                    }
                }
            },
            {
                "$sort": { "reels_views_num": -1 }
            },
            {
                "$project": {
                    "username": 1,
                    "clean_name": 1,
                    "bio": 1,
                    "category": 1,
                    "followers": 1,
                    "following": 1,
                    "posts": 1,
                    "profile_link": 1,
                    "out_link": 1,
                    "image_url": 1,
                    "reels_views": "$reels_views(15)",
                    "followers_num": 1,
                    "reels_views_num": 1,
                    "tags": 1,
                    "size": 1,
                    "memo": 1
                }
            }
        ];

        const results = await collection.aggregate(pipeline).toArray();
        return results;
    } catch (error) {
        console.error("📦 인플루언서 데이터 fetch 실패:", error);
        throw error;
    }
});
// 인플루언서 데이터 업로드
ipcMain.handle('upload-influencer-data', async (event, payload) => {
    try {
        const { brand, item, selectedInfluencers } = payload;

        // auth.js의 getCredentials 함수를 사용하여 자격 증명 가져오기
        const { getCredentials } = await import('./auth.js');
        const result = await getCredentials();
        
        let oAuth2Client;
        
        // authUrl이 있으면 인증이 필요한 상태
        if (result.authUrl) {
            throw new Error('인증이 필요합니다. 다시 시도해주세요.');
        }
        
        // creds 객체가 있으면 인증된 상태
        if (result.creds) {
            oAuth2Client = result.creds;
        } else {
            throw new Error('인증 객체를 가져올 수 없습니다.');
        }

        const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });

        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        
        // 시트명용 날짜 형식 생성 (YYMMDD)
        const sheetDateStr = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

        const spreadsheetId = '1VhEWeQASyv02knIghpcccYLgWfJCe2ylUnPsQ_-KNAI';
        
        // 브랜드명으로 시트 이름 생성 (특수문자 제거 및 공백을 언더스코어로 변경)
        const cleanBrandName = brand.replace(/[^a-zA-Z0-9가-힣]/g, '_').replace(/\s+/g, '_');
        const sheetName = `공구_${cleanBrandName}_${sheetDateStr}`;
        
        try {
            // 시트 존재 여부 확인
            await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `${sheetName}!A1`
            });
        } catch (error) {
            // 시트가 존재하지 않는 경우 새로 생성
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                resource: {
                    requests: [{
                        addSheet: {
                            properties: {
                                title: sheetName,
                                gridProperties: {
                                    rowCount: 1000,
                                    columnCount: 8
                                }
                            }
                        }
                    }]
                }
            });

            // 헤더 추가
            const headers = [
                ['url', '닉네임', '컨택 여부', '컨택 시간', '브랜드', '아이템', '시트 등록시간', '컨택 방법']
            ];
            
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${sheetName}!A1:H1`,
                valueInputOption: 'USER_ENTERED',
                resource: { values: headers }
            });
        }

        const values = selectedInfluencers.map(influencer => [
            `https://www.instagram.com/${influencer.username}`,
            influencer.name,
            '',
            '',
            brand,
            item,
            `${dateStr} ${timeStr}`,
            influencer.contactMethod
        ]);

        const appendRange = `${sheetName}!A2:H`;

        const response = await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: appendRange,
            valueInputOption: 'USER_ENTERED',
            resource: { values }
        });

        return { success: true, count: values.length };
    } catch (error) {
        console.error('Google Sheet 업로드 실패:', error);
        throw error;
    }
});

// 인플루언서 정보 조회 IPC 핸들러
ipcMain.handle('get-influencer-info', async (event, username) => {
    try {
        const db = await getMongoClient();
        const collection = db.db(config.database.name).collection(config.database.collections.influencerData);

        const influencer = await collection.findOne(
            { username: username },
            { projection: { memo: 1, username: 1, clean_name: 1 } }
        );

        if (!influencer) {
            throw new Error('인플루언서를 찾을 수 없습니다.');
        }

        return influencer;
    } catch (error) {
        console.error('인플루언서 정보 조회 중 오류 발생:', error);
        throw error;
    }
});

ipcMain.handle('save-file', async (event, { defaultPath, content }) => {
    const { filePath } = await dialog.showSaveDialog({
        title: '엑셀 파일 저장',
        defaultPath: defaultPath,
        filters: [
            { name: 'CSV 파일', extensions: ['csv'] }
        ]
    });

    if (filePath) {
        fs.writeFileSync(filePath, content, 'utf-8');
        return filePath;
    }
    return null;
});

// 인플루언서 태그 저장
ipcMain.handle('save-influencer-tags', async (event, { username, tags }) => {
    const client = await getMongoClient();
    const db = client.db(config.database.name);
    const collection = db.collection(config.database.collections.influencerData);

    return await collection.updateOne(
        { username },
        { $set: { tags } },
        { upsert: true }
    );
});

// 인플루언서 연락처 정보 저장
ipcMain.handle('save-influencer-contact', async (event, { username, method, info, excluded, reason }) => {
    const client = await getMongoClient();
    const db = client.db(config.database.name);
    const collection = db.collection(config.database.collections.influencerData);

    return await collection.updateOne(
        { username },
        {
            $set: {
                contact_method: method,
                contact_info: info,
                is_contact_excluded: excluded,
                exclusion_reason: reason
            }
        },
        { upsert: true }
    );
});

// 스크리닝 탭 데이터 조회
ipcMain.handle('fetch-screening-data', async () => {
    const client = await getMongoClient();
    const db = client.db(config.database.name);
    const collection = db.collection(config.database.collections.mainItemTodayData);

    const twentyDaysAgo = new Date();
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

    const data = await collection.find({
        crawl_date: { $gte: twentyDaysAgo },
        brand: { $ne: '확인필요' }
    })
        .sort({ crawl_date: -1 })
        .toArray();

    return data;
});

// 스크리닝 탭 인플루언서 데이터 조회
ipcMain.handle('fetch-influencer-data', async (event, cleanName) => {
    const client = await getMongoClient();
    const db = client.db(config.database.name);
    const collection = db.collection(config.database.collections.influencerData);

    const influencer = await collection.findOne(
        { clean_name: cleanName },
        { projection: { "reels_views(15)": 1, grade: 1 } }
    );

    return influencer || null;
});

ipcMain.handle('fetch-item-details', async (event, { brandName, itemName }) => {
    const client = await getMongoClient();
    const db = client.db(config.database.name);
    const collection = db.collection(config.database.collections.mainItemTodayData);

    const data = await collection.find({
        brand: brandName,
        item: itemName
    }).toArray();

    return data;
});

ipcMain.handle('fetch-influencer-views', async (event, cleanNameList) => {
    const client = await getMongoClient();
    const db = client.db(config.database.name);
    const collection = db.collection(config.database.collections.influencerData);

    const data = await collection
        .find({ clean_name: { $in: cleanNameList } })
        .project({ "clean_name": 1, "reels_views(15)": 1 })
        .toArray();

    return data;
});

// Gmail 메일 보내기 IPC 핸들러
ipcMain.handle('send-gmail', async (event, { mailOptions }) => {
    try {
        if (!authInstance) throw new Error('Gmail 인증이 완료되지 않았습니다.');

        const response = await sendGmail(authInstance, mailOptions);
        return { success: true, id: response.id };
    } catch (error) {
        console.error('Gmail 전송 실패:', error);
        throw error;
    }
});

ipcMain.handle('start-gmail-auth', async (event, { accountId, credentialsPath }) => {
    const { auth, authUrl } = await getGmailAuthUrl(accountId, credentialsPath);
    authInstance = auth;

    // 브라우저에서 인증 링크 열기
    shell.openExternal(authUrl);
    return true;
});

ipcMain.handle('send-auth-code', async (event, code) => {
    const { tokens } = await authInstance.getToken(code);
    authInstance.setCredentials(tokens);

    // 인증을 요청했던 accountId를 기억해야 경로 지정 가능
    const tokenPath = getTokenPath(authInstance.accountId); // 또는 따로 저장해 둬야 함
    fs.writeFileSync(tokenPath, JSON.stringify(tokens));
    return true;
});


ipcMain.handle('fetch-brand-verification-status', async (event, allBrands) => {
    const client = await getMongoClient();
    const db = client.db(config.database.name);
    const brandInfoCollection = db.collection(config.database.collections.brandInfoCollection);
    const brandInfos = await brandInfoCollection.find(
        { brand_name: { $in: allBrands } },
        { projection: { brand_name: 1, is_verified: 1 } }
    ).toArray();

    // 브랜드별 is_verified 상태를 Map으로 변환
    const brandVerificationMap = new Map(
        brandInfos.map(info => [info.brand_name, info.is_verified])
    );

    return brandVerificationMap;
});

// 스크리닝 : 브랜드 검증 상태 업데이트
ipcMain.handle('update-brand-verification', async (event, { brandName, verificationStatus }) => {
    const client = await getMongoClient();
    const db = client.db(config.database.name);
    const collection = db.collection(config.database.collections.brandInfoCollection);

    return await collection.updateOne(
        { brand_name: brandName },
        { $set: { is_verified: verificationStatus } }
    );
});

ipcMain.handle('fetch-influencer-data-many', async (event, cleanNameList) => {
    const client = await getMongoClient();
    const db = client.db(config.database.name);
    const collection = db.collection(config.database.collections.influencerData);

    const data = await collection
        .find({ clean_name: { $in: cleanNameList } })
        .project({ "clean_name": 1, "reels_views(15)": 1, grade: 1 })
        .toArray();

    return data;
});

ipcMain.handle('get-dm-records', async (event, cleanName) => {

    const client = await getMongoClient();
    const db = client.db(config.database.name);
    const collection = db.collection(config.database.collections.dmRecords);

    const records = await collection.find({
        influencer_name: cleanName,
        status: { $ne: 'failed' }
    })
        .sort({ dm_date: -1 }) // 최신순 정렬
        .toArray();

    return records;
});

ipcMain.handle('send-mail-with-smtp', async (event, { accountId, mailOptions }) => {
    try {
        const authInfo = smtpAuth.accounts.find(account => account.id === accountId);
        console.log('authInfo:', authInfo);
        if (!authInfo) {
            throw new Error('SMTP 인증 정보를 찾을 수 없습니다.');
        }

        const transporter = nodemailer.createTransport({
            host: authInfo.smtp.host,
            port: authInfo.smtp.port,
            secure: authInfo.smtp.secure,
            auth: {
                user: authInfo.smtp.auth.user,
                pass: authInfo.smtp.auth.pass
            }
        });

        const result = await transporter.sendMail(mailOptions);
        console.log('result:', result);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('SMTP 메일 전송 오류:', error);
        return { success: false, error: error.message };
    }
});

// 엑셀 파일 읽기 핸들러 추가
ipcMain.handle('read-excel-file', async (event, filePath) => {
    try {
        // 파일 경로 정규화
        const normalizedPath = path.normalize(filePath);
        
        // 파일 존재 여부 확인
        if (!fs.existsSync(normalizedPath)) {
            throw new Error(`파일을 찾을 수 없습니다: ${normalizedPath}`);
        }

        // 파일 읽기
        const workbook = xlsx.readFile(normalizedPath, {
            codepage: 65001, // UTF-8
            cellDates: true,
            cellNF: false,
            cellText: false
        });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // 데이터를 단순한 배열 형태로 변환
        const data = xlsx.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: '', // 빈 셀의 기본값을 빈 문자열로 설정
            blankrows: false // 빈 행 제외
        });

        // 각 행의 데이터를 문자열로 변환하여 전송
        const processedData = data.map(row => 
            row.map(cell => {
                if (cell === null || cell === undefined) return '';
                if (typeof cell === 'object' && cell instanceof Date) {
                    return cell.toISOString();
                }
                return String(cell).trim();
            })
        );

        return processedData;
    } catch (error) {
        console.error('엑셀 파일 읽기 실패:', error);
        throw new Error(`엑셀 파일 읽기 실패: ${error.message}`);
    }
});

// 토큰 갱신 핸들러
ipcMain.handle('refresh-google-token', async () => {
    try {
        const tokenPath = process.platform === 'win32'
            ? path.join(process.env.APPDATA, 'GoogleAPI', 'token.json')
            : path.join(os.homedir(), '.config', 'GoogleAPI', 'token.json');

        if (!fs.existsSync(tokenPath)) {
            throw new Error('토큰 파일이 존재하지 않습니다.');
        }

        const credToken = JSON.parse(fs.readFileSync(tokenPath));
        const credentials = await import(`file://${__dirname}/token/credentials_token.js`);
        const { client_id, client_secret } = credentials.default.installed;

        const oAuth2Client = new OAuth2Client(client_id, client_secret);
        oAuth2Client.setCredentials(credToken);

        try {
            // 토큰 갱신 시도
            if (oAuth2Client.credentials.refresh_token) {
                await oAuth2Client.refreshAccessToken();
                // 갱신된 토큰 저장
                fs.writeFileSync(tokenPath, JSON.stringify(oAuth2Client.credentials));
                return { success: true };
            } else {
                throw new Error('갱신 토큰이 없습니다. 재인증이 필요합니다.');
            }
        } catch (error) {
            // invalid_grant 오류인 경우 토큰 파일 삭제
            if (error.message.includes('invalid_grant')) {
                console.log('토큰이 무효화되었습니다. 토큰 파일을 삭제합니다.');
                fs.unlinkSync(tokenPath);
                throw new Error('토큰이 만료되었습니다. 재인증이 필요합니다.');
            }
            throw error;
        }
    } catch (error) {
        console.error('토큰 갱신 실패:', error);
        throw error;
    }
});

// Google Sheets API 관련 핸들러
ipcMain.handle('start-auth', async () => {
  try {
    const { creds, authUrl } = await getCredentials();
    if (authUrl) {
      shell.openExternal(authUrl); // 브라우저로 인증 URL 열기
      return { authUrl };
    }
    return { success: true };
  } catch (error) {
    console.error('인증 시작 실패:', error);
    throw error;
  }
});

// 구글 인증 코드 처리 핸들러 추가
ipcMain.handle('handle-google-auth-code', async (event, code) => {
    try {
        const { handleAuthCode } = await import('./auth.js');
        const auth = await handleAuthCode(code);
        return { success: true };
    } catch (error) {
        console.error('인증 코드 처리 실패:', error);
        return { success: false, error: error.message };
    }
});

// 구글 인증 시작 핸들러
ipcMain.handle('start-google-auth', async () => {
  try {
    const { getCredentials } = await import('./auth.js');
    const { authUrl } = await getCredentials();
    if (authUrl) {
      // 인증 URL 열기는 이미 auth.js에서 처리됨
      return { authUrl };
    }
    return { success: true };
  } catch (error) {
    console.error('구글 인증 시작 실패:', error);
    throw error;
  }
});

// 인플루언서 이름 업데이트
ipcMain.handle('update-influencer-name', async (event, { username, newName }) => {
    try {
        const client = await getMongoClient();
        const db = client.db(config.database.name);
        const collection = db.collection(config.database.collections.influencerData);

        const result = await collection.updateOne(
            { username },
            { $set: { clean_name: newName } }
        );

        if (result.matchedCount === 0) {
            throw new Error('인플루언서를 찾을 수 없습니다.');
        }

        return { success: true };
    } catch (error) {
        console.error('인플루언서 이름 업데이트 실패:', error);
        throw error;
    }
});

// 인플루언서 루키 상태 업데이트
ipcMain.handle('update-influencer-rookie-status', async (event, { username, isRookie }) => {
    try {
        const client = await getMongoClient();
        const db = client.db(config.database.name);
        const collection = db.collection(config.database.collections.influencerData);

        const result = await collection.updateOne(
            { username },
            { $set: { size: isRookie ? 'rookie' : 'yet' } }
        );

        if (result.matchedCount === 0) {
            throw new Error('인플루언서를 찾을 수 없습니다.');
        }

        return { success: true };
    } catch (error) {
        console.error('인플루언서 루키 상태 업데이트 실패:', error);
        throw error;
    }
});

// 메모 저장 IPC 핸들러
ipcMain.handle('save-influencer-memo', async (event, username, memo) => {
    try {
        const db = await getMongoClient();
        const collection = db.db(config.database.name).collection(config.database.collections.influencerData);

        const result = await collection.updateOne(
            { username: username },
            { $set: { memo: memo } }
        );

        if (result.matchedCount === 0) {
            throw new Error('인플루언서를 찾을 수 없습니다.');
        }

        return { success: true };
    } catch (error) {
        console.error('메모 저장 중 오류 발생:', error);
        throw error;
    }
});

// 쿠팡 검색 IPC 핸들러
ipcMain.handle('search-coupang', async (event, searchQuery) => {
    try {
        // IP 확인
        const url = 'https://ip.decodo.com/json';
        const proxyAgent = new HttpsProxyAgent(
            'http://spa8tftx9o:n~b7dbA49W9wxfgUkC@dc.decodo.com:10000'
        );

        await axios.get(url, { httpsAgent: proxyAgent });

        // 크롬 브라우저 실행
        const browser = await puppeteer.launch({
            headless: false,
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920x1080',
                '--start-maximized',
                '--disable-blink-features=AutomationControlled',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process'
            ],
            ignoreDefaultArgs: ['--disable-extensions'],
            defaultViewport: null
        });

        const pages = await browser.pages();
        const page = pages[0];

        // 자동화 감지 방지
        await page.evaluateOnNewDocument(() => {
            delete navigator.__proto__.webdriver;
            window.chrome = {
                runtime: {},
                loadTimes: function() {},
                csi: function() {},
                app: {}
            };
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5].map(() => ({
                    0: {
                        type: "application/x-google-chrome-pdf",
                        suffixes: "pdf",
                        description: "Portable Document Format",
                        enabledPlugin: true
                    }
                }))
            });
            Object.defineProperty(navigator, 'languages', {
                get: () => ['ko-KR', 'ko', 'en-US', 'en']
            });
        });

        // 헤더 설정
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'sec-ch-ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'Upgrade-Insecure-Requests': '1',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        });

        const searchUrl = `https://www.coupang.com/np/search?q=${encodeURIComponent(searchQuery)}&channel=user`;
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForSelector('li.search-product', { timeout: 10000 });
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 상품 정보 크롤링
        const products = await page.evaluate(() => {
            const bestSellerSection = document.querySelector('.best-seller-carousel-widget');
            if (bestSellerSection) bestSellerSection.remove();
            
            const timeSaleSection = document.querySelector('.sdw-aging-carousel-widget');
            if (timeSaleSection) timeSaleSection.remove();
            
            const items = document.querySelectorAll('li.search-product:not(.best-seller-carousel-item):not(.sdw-aging-carousel-item)');
            
            return Array.from(items).map((item, index) => {
                const name = item.querySelector('.name')?.textContent.trim() || '';
                const price = item.querySelector('.price-value')?.textContent.trim() || '';
                const rating = item.querySelector('.rating')?.style.width || '0%';
                const reviewCount = item.querySelector('.rating-total-count')?.textContent.replace(/[()]/g, '') || '0';
                const imageUrl = item.querySelector('img.search-product-wrap-img')?.src || '';
                const productLink = item.querySelector('a.search-product-link')?.href || '';
                const isAd = item.querySelector('.ad-badge') !== null;
                
                const rocketBadge = item.querySelector('.badge.rocket');
                const rocketDelivery = rocketBadge ? true : false;
                const rocketType = rocketBadge ? 
                    (rocketBadge.querySelector('img')?.src.includes('logo_rocket') ? '로켓배송' : 
                     rocketBadge.querySelector('img')?.src.includes('logoRocketMerchant') ? '판매자로켓' : '일반배송') : '일반배송';
                
                const isRocketGlobal = item.querySelector('.badge.global') !== null;
                const deliveryType = isRocketGlobal ? '로켓직구' : rocketType;
                const isRocket = isRocketGlobal ? false : rocketDelivery;
                
                const productId = item.getAttribute('data-product-id') || '';
                const vendorItemId = item.getAttribute('data-vendor-item-id') || '';
                
                return {
                    productId,
                    vendorItemId,
                    rank: index + 1,
                    name,
                    price,
                    priceValue: parseInt(price.replace(/[^0-9]/g, '')),
                    rating: parseFloat(rating) / 20,
                    reviewCount: parseInt(reviewCount),
                    imageUrl,
                    productLink,
                    isAd,
                    deliveryType: {
                        isRocket,
                        type: deliveryType
                    }
                };
            });
        });

        // 통계 계산
        const deliveryStats = products.reduce((acc, product) => {
            acc[product.deliveryType.type] = (acc[product.deliveryType.type] || 0) + 1;
            return acc;
        }, {});

        const rocketDeliveryCount = (deliveryStats['로켓배송'] || 0) + (deliveryStats['판매자로켓'] || 0);
        const totalCount = products.length - (deliveryStats['로켓직구'] || 0);
        const rocketDeliveryPercentage = ((rocketDeliveryCount / totalCount) * 100).toFixed(1);

        const adStats = products.reduce((acc, product) => {
            acc[product.isAd ? '광고' : '일반'] = (acc[product.isAd ? '광고' : '일반'] || 0) + 1;
            return acc;
        }, {});

        const prices = products
            .map(product => product.priceValue)
            .filter(price => !isNaN(price))
            .sort((a, b) => a - b);

        const filteredPrices = prices.slice(5, -5);
        const averagePrice = Math.round(filteredPrices.reduce((sum, price) => sum + price, 0) / filteredPrices.length);

        // 브라우저는 계속 열어둡니다
        return {
            products,
            stats: {
                rocketDeliveryPercentage,
                averagePrice,
                adStats,
                deliveryStats
            }
        };
    } catch (error) {
        console.error('쿠팡 검색 중 오류 발생:', error);
        throw error;
    }
});

// 네이버 데이터랩 API 핸들러
ipcMain.handle('get-naver-trend', async (event, keyword) => {
    try {
        const endDate = new Date();
        endDate.setDate(1);
        endDate.setDate(endDate.getDate() - 1);
        
        const startDate5Y = new Date();
        startDate5Y.setFullYear(startDate5Y.getFullYear() - 5);

        const startDate3Y = new Date();
        startDate3Y.setFullYear(startDate3Y.getFullYear() - 3);

        const startDate1Y = new Date();
        startDate1Y.setFullYear(startDate1Y.getFullYear() - 1);

        const requestBody5Y = {
            startDate: startDate5Y.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            timeUnit: "month",
            keywordGroups: [
                {
                    groupName: keyword,
                    keywords: [keyword]
                }
            ],
            device: "pc",
            ages: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"],
            gender: "m"
        };

        const requestBody3Y = {
            ...requestBody5Y,
            startDate: startDate3Y.toISOString().split('T')[0]
        };

        const requestBody1Y = {
            ...requestBody5Y,
            startDate: startDate1Y.toISOString().split('T')[0]
        };

        const [response5Y, response3Y, response1Y] = await Promise.all([
            axios.post('https://openapi.naver.com/v1/datalab/search', requestBody5Y, {
                headers: {
                    'X-Naver-Client-Id': 'GQMIvTMEGg6ea83sZUGe',
                    'X-Naver-Client-Secret': 'MraZMTF88_',
                    'Content-Type': 'application/json'
                }
            }),
            axios.post('https://openapi.naver.com/v1/datalab/search', requestBody3Y, {
                headers: {
                    'X-Naver-Client-Id': 'GQMIvTMEGg6ea83sZUGe',
                    'X-Naver-Client-Secret': 'MraZMTF88_',
                    'Content-Type': 'application/json'
                }
            }),
            axios.post('https://openapi.naver.com/v1/datalab/search', requestBody1Y, {
                headers: {
                    'X-Naver-Client-Id': 'GQMIvTMEGg6ea83sZUGe',
                    'X-Naver-Client-Secret': 'MraZMTF88_',
                    'Content-Type': 'application/json'
                }
            })
        ]);

        return {
            fiveYear: response5Y.data.results[0],
            threeYear: response3Y.data.results[0],
            oneYear: response1Y.data.results[0]
        };
    } catch (error) {
        console.error('네이버 트렌드 API 호출 중 오류:', error);
        throw error;
    }
});

// 네이버 검색광고 API 핸들러
ipcMain.handle('get-naver-keyword-stats', async (event, keyword) => {
    try {
        const timestamp = Date.now().toString();
        const method = 'GET';
        const uri = '/keywordstool';
        
        const customerId = '2708075';
        const apiKey = '0100000000b62d7b33e8c8802cd536da976902c824be8a5a34b0fe73865d4360a5f4c05391';
        const secretKey = 'AQAAAAC2LXsz6MiALNU22pdpAsgkYdmcZdfmvPB+rRfuez8Gdw==';
        const baseUrl = 'https://api.searchad.naver.com';

        // 시그니처 생성
        const message = timestamp + '.' + method + '.' + uri;
        const signature = crypto.createHmac('sha256', Buffer.from(secretKey, 'utf-8'))
            .update(message)
            .digest('base64');
        
        const headers = {
            'X-Timestamp': timestamp,
            'X-API-KEY': apiKey,
            'X-Customer': customerId,
            'X-Signature': signature,
            'Content-Type': 'application/json'
        };
        
        const params = {
            hintKeywords: keyword,
            showDetail: 1
        };

        const response = await axios.get(`${baseUrl}${uri}`, {
            headers,
            params
        });

        const data = response.data;
        
        if (!data.keywordList || data.keywordList.length === 0) {
            throw new Error('키워드 데이터가 없습니다.');
        }

        // 데이터 가공
        const processedData = data.keywordList.map(item => ({
            keyword: item.relKeyword,
            pcCount: item.monthlyPcQcCnt === "<10" ? 0 : Number(item.monthlyPcQcCnt),
            mobileCount: item.monthlyMobileQcCnt === "<10" ? 0 : Number(item.monthlyMobileQcCnt),
            totalCount: (item.monthlyPcQcCnt === "<10" ? 0 : Number(item.monthlyPcQcCnt)) +
                       (item.monthlyMobileQcCnt === "<10" ? 0 : Number(item.monthlyMobileQcCnt)),
            competition: item.competitionIndex,
            averageBid: item.avgMonthlyBid
        }));

        return processedData;
    } catch (error) {
        console.error('네이버 검색광고 API 호출 중 오류:', error);
        throw error;
    }
});

// MongoDB 클라이언트 접근을 위한 IPC 핸들러
ipcMain.handle('get-mongo-client', async () => {
    try {
        const client = await getMongoClient();
        return client;
    } catch (error) {
        console.error('MongoDB 클라이언트 연결 중 오류 발생:', error);
        throw error;
    }
});

// 키워드500 관련 IPC 핸들러
ipcMain.handle('get-keyword500-categories', async () => {
    try {
        const client = await getMongoClient();
        const db = client.db('insta09_database');
        const collection = db.collection('gogoya_keyword500');

        const categories = await collection.find({}, {
            projection: {
                _id: 1,
                category: 1,
                'keyword_history.date': 1
            }
        }).toArray();

        // ObjectId를 문자열로 변환
        return categories.map(category => ({
            ...category,
            _id: category._id.toString()
        }));
    } catch (error) {
        console.error('키워드500 카테고리 조회 중 오류 발생:', error);
        throw error;
    }
});

ipcMain.handle('get-keyword500-keywords', async (event, categoryId) => {
    try {
        if (!categoryId) {
            throw new Error('카테고리 ID가 필요합니다.');
        }

        const client = await getMongoClient();
        const db = client.db('insta09_database');
        const collection = db.collection('gogoya_keyword500');

        const categoryData = await collection.findOne(
            { _id: categoryId },
            { projection: { category: 1, keyword_history: 1 } }
        );

        if (!categoryData || !categoryData.keyword_history.length) {
            throw new Error('키워드 데이터가 없습니다.');
        }

        // keyword_history 배열을 날짜 기준으로 정렬하여 가장 최신 데이터 가져오기
        const sortedHistory = categoryData.keyword_history.sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });

        const latestData = sortedHistory[0];

        return {
            category: categoryData.category,
            keywords: latestData.keywords,
            date: latestData.date
        };
    } catch (error) {
        console.error('키워드500 키워드 조회 중 오류 발생:', error);
        throw error;
    }
});

// 키워드500 선택된 키워드 조회 핸들러
ipcMain.handle('get-keyword500-picked-keywords', async (event, categoryId) => {
    try {
        const client = await getMongoClient();
        const db = client.db('insta09_database');
        const collection = db.collection('gogoya_keyword_Gold');
        
        const pickedKeywords = await collection.find(
            { 
                category_id: categoryId,
                status: 'pick'
            },
            { projection: { keyword: 1, search_volume: 1, search_volume_updated_at: 1, _id: 0 } }
        ).toArray();
        
        // 검색량 정보와 업데이트 날짜를 포함한 객체 배열로 변환
        return pickedKeywords.map(item => ({
            keyword: item.keyword,
            searchVolume: item.search_volume || null,
            searchVolumeUpdatedAt: item.search_volume_updated_at || null
        }));
    } catch (error) {
        console.error('선택된 키워드 조회 중 오류 발생:', error);
        throw error;
    }
});

// 키워드500 키워드 선택 상태 저장 핸들러
ipcMain.handle('save-keyword500-pick', async (event, { categoryId, keyword, searchVolume }) => {
    try {
        const result = await saveKeyword500Pick(categoryId, keyword, searchVolume);
        return result;
    } catch (error) {
        console.error('키워드 저장 실패:', error);
        throw error;
    }
});

// 키워드500 키워드 선택 해제 핸들러
ipcMain.handle('remove-keyword500-pick', async (event, { categoryId, keyword }) => {
    try {
        const result = await removeKeyword500Pick(categoryId, keyword);
        return result;
    } catch (error) {
        console.error('키워드500 선택 해제 중 오류 발생:', error);
        throw error;
    }
});

// 브랜드 웹사이트 URL 가져오기
ipcMain.handle('get-brand-website-url', async (event, brandName) => {
    try {
        const mongoModule = await import('./src/js/databases/mongo.js');
        return await mongoModule.getBrandWebsiteUrl(brandName);
    } catch (error) {
        console.error('브랜드 웹사이트 URL 조회 실패:', error);
        return null;
    }
});

// 새 창 생성 핸들러
ipcMain.handle('open-new-window', async (event, pagePath) => {
    const newWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'src/preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    // 전체화면으로 시작
    newWindow.maximize();
    
    // index.html?version=v0.7.5&page=pagePath 처럼 전달
    newWindow.loadFile('index.html', {
        query: { 
            version: tagName,
            page: pagePath
        }
    });

    // 모든 외부 링크를 기본 브라우저에서 열도록 설정
    newWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // 모든 링크 클릭 이벤트 처리
    newWindow.webContents.on('will-navigate', (event, url) => {
        if (url.startsWith('http')) {
            event.preventDefault();
            shell.openExternal(url);
        }
    });

    // 개발자 도구 열기 (F12)
    newWindow.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F12') {
            newWindow.webContents.toggleDevTools();
        }
        // 새로고침 (F5)
        if (input.key === 'F5') {
            newWindow.reload();
        }
    });
});

// ===========================================
// Electron 앱 윈도우 생성
// ===========================================
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'src/preload.js'), // 여기에 안전한 통신용 preload 스크립트
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    // 전체화면으로 시작
    mainWindow.maximize();
    // index.html?version=v0.7.5 처럼 전달
    mainWindow.loadFile('index.html', {
        query: { version: tagName }
    });

    // 모든 외부 링크를 기본 브라우저에서 열도록 설정
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        //require('electron').shell.openExternal(url);
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // 모든 링크 클릭 이벤트 처리
    mainWindow.webContents.on('will-navigate', (event, url) => {
        if (url.startsWith('http')) {
            event.preventDefault();
            //require('electron').shell.openExternal(url);
            shell.openExternal(url);
        }
    });

    // 개발자 도구 열기 (F12)
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F12') {
            mainWindow.webContents.toggleDevTools();
        }
        // 새로고침 (F5)
        if (input.key === 'F5') {
            mainWindow.reload();
        }
    });
}

// 업데이트 이벤트 핸들러
autoUpdater.on('checking-for-update', () => {
    console.log('업데이트 확인 중...');
});

autoUpdater.on('update-available', (info) => {
    console.log('새로운 업데이트가 있습니다:', info.version);
});

autoUpdater.on('update-not-available', (info) => {
    console.log('이미 최신 버전입니다.');
});

autoUpdater.on('error', (err) => {
    console.log('업데이트 중 오류 발생:', err);
});

autoUpdater.on('download-progress', (progressObj) => {
    console.log('다운로드 진행률:', progressObj.percent);
});

autoUpdater.on('update-downloaded', (info) => {
    console.log('업데이트 다운로드 완료');
    // 업데이트 설치 및 앱 재시작
    autoUpdater.quitAndInstall();
});

// 개발 모드에서 Git 업데이트 확인
async function checkGitUpdate() {
    console.log('Git 업데이트 확인 시작...');
    const updater = new ReleaseUpdater(owner, repo);

    try {
        console.log('현재 버전 확인 중...');
        const currentVersion = updater.getCurrentVersion();
        console.log('현재 버전:', currentVersion);

        console.log('최신 릴리즈 확인 중...');
        const latestRelease = await updater.getLatestRelease();
        console.log('최신 릴리즈:', latestRelease);

        if (!latestRelease) {
            console.log('최신 릴리즈 정보를 가져올 수 없습니다.');
            return;
        }

        const updateResult = await updater.updateToLatest();
        console.log('업데이트 결과:', updateResult);

        if (updateResult) {
            const newVersion = updater.getCurrentVersion();
            console.log('업데이트 후 버전:', newVersion);

            if (currentVersion !== newVersion) {
                console.log('새로운 버전이 설치되었습니다.');
                const result = await dialog.showMessageBox(mainWindow, {
                    type: 'info',
                    title: '업데이트 완료',
                    message: '새로운 버전이 설치되었습니다. 앱을 재시작하시겠습니까?',
                    buttons: ['예', '아니오']
                });

                if (result.response === 0) {
                    app.relaunch();
                    app.quit();
                }
            }
        }
    } catch (error) {
        console.error('Git 업데이트 중 오류 발생:', error);
    }
}

// ===========================================
// 앱 준비 완료되면 창 띄우기
// ===========================================
app.whenReady().then(async () => {
    console.log('앱 시작...');
    createWindow();

    // 개발 모드인 경우 Git 업데이트 확인
    if (isDev) {
        console.log('개발 모드에서 Git 업데이트 확인 시작');
        await checkGitUpdate();
    } else {
        console.log('프로덕션 모드에서 electron-updater 시작');
        // 개발 모드가 아니더라도 패키징되지 않은 상태에서는 release_updater 사용
        if (!app.isPackaged) {
            console.log('패키징되지 않은 상태에서 release_updater 사용');
            await checkGitUpdate();
        } else {
            autoUpdater.checkForUpdates();
        }
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// ===========================================
// 모든 창이 닫혔을 때 앱 종료
// ===========================================
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// 노션 업로드 핸들러
ipcMain.handle('notion-upload', async (event, sourcingData) => {
    try {
        const { createSubpageWithCallout } = await import('./src/js/classes/tab2/notion_module/createSubpage.js');
        const { addItemsToDatabase } = await import('./src/js/classes/tab2/notion_module/utils/databaseUtils.js');

        // 서브페이지와 데이터베이스 생성
        const result = await createSubpageWithCallout(sourcingData.cleanName);
        
        if (!result.pageId || !result.dbId) {
            throw new Error('서브페이지 또는 데이터베이스 생성 실패');
        }

        // 데이터베이스에 아이템 추가
        const uploadResult = await addItemsToDatabase(result.dbId, sourcingData.data);
        if (!uploadResult) {
            throw new Error('데이터베이스에 아이템 추가 실패');
        }
        
        return {
            success: true,
            message: '노션 업로드가 완료되었습니다.',
            pageId: result.pageId,
            dbId: result.dbId,
            pageUrl: result.pageUrl
        };
    } catch (error) {
        console.error('노션 업로드 실패:', error);
        return {
            success: false,
            message: error.message || '노션 업로드 중 오류가 발생했습니다.'
        };
    }
});

// 외부 링크 열기 핸들러
ipcMain.handle('open-external-link', async (event, url) => {
    try {
        await shell.openExternal(url);
        return true;
    } catch (error) {
        console.error('외부 링크 열기 실패:', error);
        return false;
    }
});

// 키워드 검색 IPC 핸들러 추가
ipcMain.handle('search-content-by-keyword', async (event, { username, keyword }) => {
    try {
        const client = await getMongoClient();
        const db = client.db('insta09_database');
        const influencerCollection = db.collection('02_main_influencer_data');
        const feedCollection = db.collection('01_main_newfeed_crawl_data');

        // username으로 검색
        let influencer = await influencerCollection.findOne({ username: username });
        if (!influencer) {
            // clean_name으로 검색
            influencer = await influencerCollection.findOne({ clean_name: username });
        }

        if (!influencer) {
            return [];
        }

        const query = {
            author: influencer.username,
            content: { $regex: keyword, $options: 'i' }
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
    } catch (error) {
        console.error('키워드 검색 중 오류 발생:', error);
        throw error;
    }
});