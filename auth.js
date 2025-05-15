import fs from 'fs';
import path from 'path';
import os from 'os';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';
import { shell } from 'electron';
import { URL } from 'url';

dotenv.config();

// Google API 접근 범위 설정 (필요한 최소한의 범위만 포함)
const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/calendar'
];

// 환경 변수에서 클라이언트 정보 가져오기
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

function getTokenPath() {
  /**
   * 운영 체제에 따른 토큰 저장 경로 반환
   */
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA, 'GoogleAPI', 'token.json');
  }
  return path.join(os.homedir(), '.config', 'GoogleAPI', 'token.json');
}

function ensureTokenDir() {
  /**
   * 토큰 저장 디렉토리가 없으면 생성
   */
  const tokenDir = path.dirname(getTokenPath());
  if (!fs.existsSync(tokenDir)) {
    fs.mkdirSync(tokenDir, { recursive: true });
  }
}

// URL에서 인증 코드 추출 함수 (나중에 사용될 수 있음)
function extractCodeFromUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('code');
  } catch (e) {
    return null;
  }
}

// 간소화된 인증 프로세스용 대기 함수
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getCredentials() {
  /**
   * OAuth2 인증을 통해 자격 증명 반환
   */
  const tokenPath = getTokenPath();
  ensureTokenDir();

  let creds = null;
  
  // 저장된 토큰이 있으면 로드
  if (fs.existsSync(tokenPath)) {
    const token = JSON.parse(fs.readFileSync(tokenPath));
    creds = new OAuth2Client({
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET
    });
    creds.setCredentials(token);
  }
  
  // 토큰이 없거나 유효하지 않으면 새로 생성
  if (!creds || !isTokenValid(creds)) {
    const { oAuth2Client, authUrl } = await authenticateWithOAuth();
    // 인증 URL만 반환하고, 인증 코드는 main.js에서 처리
    return { authUrl };
  }
  
  // 생성된 토큰을 파일에 저장
  fs.writeFileSync(tokenPath, JSON.stringify(creds.credentials));
  
  return { creds };
}

function isTokenValid(auth) {
  /**
   * 토큰의 유효성 검사
   */
  if (!auth.credentials.expiry_date) {
    return false;
  }
  
  // 토큰 만료 시간과 현재 시간 비교 (5분 여유 두기)
  return auth.credentials.expiry_date > Date.now() + (5 * 60 * 1000);
}

async function authenticateWithOAuth() {
  /**
   * OAuth2 인증 프로세스 실행
   */
  const oAuth2Client = new OAuth2Client(
    CLIENT_ID,
    CLIENT_SECRET,
    'http://localhost'
  );
  
  // 인증 URL 생성
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent' // 항상 새로운 refresh_token을 받기 위해
  });
  
  console.log('다음 URL에서 인증을 완료하세요!!:', authUrl);
  
  // 브라우저에서 인증 URL 자동으로 열기
  shell.openExternal(authUrl);
  
  // 인증 코드를 얻을 수 없으므로 인증 URL만 반환
  console.log('=============================================');
  console.log('⚠️ 인증 후 URL에서 코드를 복사하여 main.js에서 처리해주세요.');
  console.log('예: http://localhost/?code=XXXX 에서 code 파라미터 값을 추출');
  console.log('=============================================');
  
  // 간단한 대기 시간 추가
  await sleep(3000);
  
  // 여기서는 토큰을 받지 않고 URL만 반환
  return { oAuth2Client, authUrl };
}

// main.js에서 코드를 받아 토큰 처리를 위한 함수 추가
async function handleAuthCode(code) {
  if (!code) {
    throw new Error('인증 코드가 제공되지 않았습니다.');
  }
  
  const oAuth2Client = new OAuth2Client(
    CLIENT_ID,
    CLIENT_SECRET,
    'http://localhost'
  );
  
  // 코드로 토큰 얻기
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  
  // 토큰 저장
  const tokenPath = getTokenPath();
  fs.writeFileSync(tokenPath, JSON.stringify(tokens));
  
  return oAuth2Client;
}

export {
  getCredentials,
  handleAuthCode,
  extractCodeFromUrl
};