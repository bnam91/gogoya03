const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const puppeteer = require('puppeteer');
const readline = require('readline');

// readline 인터페이스 생성
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false  // 터미널 에뮬레이션 비활성화
});

// 사용자 입력을 받는 함수
function getUserInput() {
  return new Promise((resolve) => {
    rl.question('검색어를 입력하세요: ', (answer) => {
      resolve(answer);
    });
  });
}

const url = 'https://ip.decodo.com/json';
const proxyAgent = new HttpsProxyAgent(
  'http://spa8tftx9o:n~b7dbA49W9wxfgUkC@dc.decodo.com:10000');

// IP 확인
axios
  .get(url, {
    httpsAgent: proxyAgent,
  })
  .then((response) => {
    console.log(response.data);
  });

// 크롬 브라우저 실행
(async () => {
  // 사용자 입력 받기
  const searchQuery = await getUserInput();
  const searchUrl = `https://www.coupang.com/np/search?q=${encodeURIComponent(searchQuery)}&channel=user`;
  
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
  
  // 첫 번째 탭을 가져옵니다
  const pages = await browser.pages();
  const page = pages[0];
  
  // 자동화 감지 방지 강화
  await page.evaluateOnNewDocument(() => {
    // WebDriver 속성 제거
    delete navigator.__proto__.webdriver;
    
    // Chrome 런타임 속성 추가
    window.chrome = {
      runtime: {},
      loadTimes: function() {},
      csi: function() {},
      app: {}
    };

    // Permissions API 모의 구현
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );

    // 플러그인 정보 수정
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

    // 언어 설정
    Object.defineProperty(navigator, 'languages', {
      get: () => ['ko-KR', 'ko', 'en-US', 'en']
    });
  });

  // 기본 헤더 설정
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'sec-ch-ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
  });

  // 랜덤한 마우스 움직임 추가
  await page.evaluate(() => {
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );
  });

  await page.goto(searchUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 15000
  });
  
  console.log('페이지 로딩 완료, 상품 목록 로딩 대기 중...');
  
  // 상품 목록이 로드될 때까지 대기
  await page.waitForSelector('li.search-product', { timeout: 10000 });
  
  // 추가로 1초 대기 (동적 콘텐츠 완전 로드를 위해)
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('상품 정보 크롤링 시작...');

  // 상품 정보 크롤링
  const products = await page.evaluate(() => {
    console.log('페이지 내 상품 검색 중...');
    
    // 베스트셀러 섹션 제외
    const bestSellerSection = document.querySelector('.best-seller-carousel-widget');
    if (bestSellerSection) {
      bestSellerSection.remove();
    }
    
    // 한정 시간 특가 섹션 제외
    const timeSaleSection = document.querySelector('.sdw-aging-carousel-widget');
    if (timeSaleSection) {
      timeSaleSection.remove();
    }
    
    // 일반 검색 결과만 선택
    const items = document.querySelectorAll('li.search-product:not(.best-seller-carousel-item):not(.sdw-aging-carousel-item)');
    console.log(`총 ${items.length}개의 상품 발견`);
    
    return Array.from(items)
      .map((item, index) => {
        console.log(`${index + 1}번째 상품 정보 추출 중...`);
        
        const name = item.querySelector('.name')?.textContent.trim() || '';
        const price = item.querySelector('.price-value')?.textContent.trim() || '';
        const rating = item.querySelector('.rating')?.style.width || '0%';
        const reviewCount = item.querySelector('.rating-total-count')?.textContent.replace(/[()]/g, '') || '0';
        const imageUrl = item.querySelector('img.search-product-wrap-img')?.src || '';
        const productLink = item.querySelector('a.search-product-link')?.href || '';
        
        // 광고 여부 확인
        const isAd = item.querySelector('.ad-badge') !== null;
        
        // 로켓배송 관련 정보 상세 추출
        const rocketBadge = item.querySelector('.badge.rocket');
        const rocketDelivery = rocketBadge ? true : false;
        const rocketType = rocketBadge ? 
          (rocketBadge.querySelector('img')?.src.includes('logo_rocket') ? '로켓배송' : 
           rocketBadge.querySelector('img')?.src.includes('logoRocketMerchant') ? '판매자로켓' : '일반배송') : '일반배송';
        
        // 로켓직구 여부 확인
        const isRocketGlobal = item.querySelector('.badge.global') !== null;
        const deliveryType = isRocketGlobal ? '로켓직구' : rocketType;
        const isRocket = isRocketGlobal ? false : rocketDelivery;
        
        const productId = item.getAttribute('data-product-id') || '';
        const vendorItemId = item.getAttribute('data-vendor-item-id') || '';
        const rank = index + 1; // 순서대로 rank 부여
        
        // 판매자 정보 추출
        const sellerInfo = item.querySelector('.used-product-info')?.textContent.trim() || '';
        const isNewProduct = sellerInfo.includes('새 상품');
        const isUsedProduct = sellerInfo.includes('중고 상품');

        // 가격을 숫자로 변환
        const priceValue = parseInt(price.replace(/[^0-9]/g, ''));

        return {
          productId,
          vendorItemId,
          rank,
          name,
          price,
          priceValue,
          rating: parseFloat(rating) / 20, // 90% -> 4.5
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

  console.log('크롤링 완료, 파일 저장 시작...');

  // JSON 파일로 저장
  const fs = require('fs');
  try {
    const filePath = 'coupang_products.json';
    fs.writeFileSync(filePath, JSON.stringify(products, null, 2), 'utf8');
    console.log('파일 저장 완료!');
    console.log('저장된 파일 경로:', filePath);
    console.log('크롤링된 상품 수:', products.length);
    
    // 배송 유형 통계
    const deliveryStats = products.reduce((acc, product) => {
      acc[product.deliveryType.type] = (acc[product.deliveryType.type] || 0) + 1;
      return acc;
    }, {});
    console.log('\n배송 유형 통계:', deliveryStats);
    
    // 로켓배송 비율 계산 (로켓직구 제외)
    const rocketDeliveryCount = (deliveryStats['로켓배송'] || 0) + (deliveryStats['판매자로켓'] || 0);
    const totalCount = products.length - (deliveryStats['로켓직구'] || 0);
    const rocketDeliveryPercentage = ((rocketDeliveryCount / totalCount) * 100).toFixed(1);
    console.log(`\n로켓배송 비율: ${rocketDeliveryPercentage}% (로켓직구 제외)`);
    
    // 광고 상품 통계
    const adStats = products.reduce((acc, product) => {
      acc[product.isAd ? '광고' : '일반'] = (acc[product.isAd ? '광고' : '일반'] || 0) + 1;
      return acc;
    }, {});
    console.log('\n광고 상품 통계:', adStats);
    
    // 가격 분석
    const prices = products
      .map(product => {
        // 빈 가격이나 유효하지 않은 가격은 제외
        if (!product.price || product.price.trim() === '') return null;
        // 쉼표 제거하고 숫자로 변환
        return parseInt(product.price.replace(/,/g, ''));
      })
      .filter(price => price !== null) // null 값 제거
      .sort((a, b) => a - b);
    
    // 상위/하위 5개 제외
    const filteredPrices = prices.slice(5, -5);
    const averagePrice = Math.round(filteredPrices.reduce((sum, price) => sum + price, 0) / filteredPrices.length);
    
    console.log('\n가격 분석:');
    console.log(`전체 상품 수: ${prices.length}개`);
    console.log(`분석 대상 상품 수: ${filteredPrices.length}개 (상위/하위 5개 제외)`);
    console.log(`평균 가격: ${averagePrice.toLocaleString()}원`);
    console.log(`최저 가격: ${prices[0].toLocaleString()}원`);
    console.log(`최고 가격: ${prices[prices.length - 1].toLocaleString()}원`);
    
  } catch (error) {
    console.error('파일 저장 중 오류 발생:', error);
    console.error('오류 상세:', error.message);
  }

  // 브라우저는 계속 열어둡니다
})();