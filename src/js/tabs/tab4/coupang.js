/**
 * 쿠팡 페이지 관리를 위한 JavaScript 모듈
 */
export function initPage() {
    console.log('쿠팡 페이지 초기화');
    initEventListeners();
}

let currentProducts = []; // 현재 검색 결과 저장

function initEventListeners() {
    const searchInput = document.getElementById('coupang-search-input');
    const searchButton = document.getElementById('coupang-search-button');
    const searchResults = document.getElementById('coupang-search-results');
    const loadingIndicator = document.getElementById('coupang-loading');
    const filterContainer = document.getElementById('coupang-filter-container');

    // 검색 버튼 클릭 이벤트
    searchButton.addEventListener('click', async () => {
        const searchQuery = searchInput.value.trim();
        if (!searchQuery) {
            alert('검색어를 입력해주세요.');
            return;
        }

        try {
            // 로딩 표시
            loadingIndicator.style.display = 'block';
            searchResults.innerHTML = '';
            filterContainer.style.display = 'none';
            document.getElementById('coupang-trend-charts').style.display = 'none';
            document.getElementById('coupang-keyword-stats').style.display = 'none';

            // 네이버 검색광고 API용 키워드 (띄어쓰기 제거)
            const keywordForNaverAPI = searchQuery.replace(/\s+/g, '');

            // 검색, 트렌드, 키워드 통계를 병렬로 가져오기
            const [searchResult, trendResult, keywordStats] = await Promise.all([
                window.coupangAPI.search(searchQuery),
                window.coupangAPI.getTrend(searchQuery),
                window.coupangAPI.getKeywordStats(keywordForNaverAPI) // 띄어쓰기 제거된 키워드 사용
            ]);

            currentProducts = searchResult.products;
            console.log('검색 결과 상품 목록:', currentProducts);
            const initialStats = calculateStats(currentProducts);
            console.log('초기 통계 계산 결과:', initialStats);
            displaySearchResults({ products: currentProducts, stats: initialStats });
            filterContainer.style.display = 'block';
            await displayTrendCharts(searchQuery);
            displayKeywordStats(keywordStats, searchQuery); // 원본 검색어 전달 (표시용)

        } catch (error) {
            console.error('검색 중 오류 발생:', error);
            searchResults.innerHTML = `<div class="error-message">검색 중 오류가 발생했습니다: ${error.message}</div>`;
        } finally {
            loadingIndicator.style.display = 'none';
        }
    });

    // 엔터 키 이벤트
    searchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            searchButton.click();
        }
    });

    // 필터 버튼 이벤트
    filterContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('filter-button')) {
            // 활성화된 버튼 스타일 변경
            filterContainer.querySelectorAll('.filter-button').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');

            // 필터링 적용
            const filterType = event.target.dataset.filter;
            filterProducts(filterType);
        }
    });
}

function filterProducts(filterType) {
    console.log('filterProducts 시작 - 필터 타입:', filterType);
    console.log('현재 상품 목록:', currentProducts);
    
    let filteredProducts = [...currentProducts];

    switch (filterType) {
        case 'rocket':
            filteredProducts = currentProducts.filter(product => 
                product.deliveryType.type === '로켓배송' || 
                product.deliveryType.type === '판매자로켓'
            );
            break;
        case 'ad':
            filteredProducts = currentProducts.filter(product => product.isAd);
            break;
        // 'all'인 경우 필터링하지 않음
    }

    console.log('필터링된 상품 목록:', filteredProducts);

    // 필터링된 결과로 통계 재계산
    const stats = calculateStats(filteredProducts);
    console.log('계산된 통계:', stats);

    displaySearchResults({ products: filteredProducts, stats });
}

function calculateStats(products) {
    console.log('calculateStats 입력 데이터:', products);
    console.log('products 길이:', products?.length);

    if (!products || products.length === 0) {
        console.log('products가 비어있음');
        return {
            rocketDeliveryPercentage: '0.0',
            averagePrice: 0,
            adStats: { 광고: 0, 일반: 0 },
            deliveryStats: {},
            lowReviewCount: 0,
            lowReviewPercentage: '0.0'
        };
    }

    const deliveryStats = products.reduce((acc, product) => {
        acc[product.deliveryType.type] = (acc[product.deliveryType.type] || 0) + 1;
        return acc;
    }, {});

    const rocketDeliveryCount = (deliveryStats['로켓배송'] || 0) + (deliveryStats['판매자로켓'] || 0);
    const totalCount = products.length - (deliveryStats['로켓직구'] || 0);
    const rocketDeliveryPercentage = totalCount > 0 ? ((rocketDeliveryCount / totalCount) * 100).toFixed(1) : '0.0';

    const adStats = products.reduce((acc, product) => {
        acc[product.isAd ? '광고' : '일반'] = (acc[product.isAd ? '광고' : '일반'] || 0) + 1;
        return acc;
    }, {});

    const prices = products
        .map(product => product.priceValue)
        .filter(price => !isNaN(price))
        .sort((a, b) => a - b);

    const filteredPrices = prices.slice(5, -5);
    const averagePrice = filteredPrices.length > 0 
        ? Math.round(filteredPrices.reduce((sum, price) => sum + price, 0) / filteredPrices.length)
        : 0;

    // 상위 12개 상품의 리뷰 수 분석
    const top12Products = products.slice(0, Math.min(12, products.length));
    console.log('상위 12개 상품:', top12Products);
    console.log('각 상품의 리뷰 수:', top12Products.map(p => p.reviewCount));

    const lowReviewProducts = top12Products.filter(product => {
        console.log('상품 리뷰 수 확인:', product.name, product.reviewCount);
        return product.reviewCount !== undefined && product.reviewCount < 100;
    });
    console.log('리뷰 100개 미만 상품:', lowReviewProducts);

    const lowReviewCount = lowReviewProducts.length;
    const lowReviewPercentage = top12Products.length > 0 
        ? ((lowReviewCount / top12Products.length) * 100).toFixed(1)
        : '0.0';

    console.log('최종 계산된 값:', {
        lowReviewCount,
        lowReviewPercentage,
        top12Length: top12Products.length
    });

    return {
        rocketDeliveryPercentage,
        averagePrice,
        adStats,
        deliveryStats,
        lowReviewCount,
        lowReviewPercentage
    };
}

function getDeliveryBadgeClass(deliveryType) {
    switch (deliveryType) {
        case '로켓배송':
            return 'rocket';
        case '판매자로켓':
            return 'seller-rocket';
        case '로켓직구':
            return 'global';
        default:
            return 'normal';
    }
}

function displaySearchResults(data) {
    console.log('displaySearchResults 입력 데이터:', data);
    console.log('stats 데이터:', data.stats);
    
    const searchResults = document.getElementById('coupang-search-results');
    
    // 통계 정보를 먼저 표시
    const statsHtml = `
        <div class="stats-container">
            <h3>검색 결과 통계</h3>
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="label">검색된 상품 수</div>
                    <div class="value">${data.products.length}개</div>
                </div>
                <div class="stat-item">
                    <div class="label">로켓배송 비율</div>
                    <div class="value">${data.stats.rocketDeliveryPercentage}%</div>
                </div>
                <div class="stat-item">
                    <div class="label">평균 가격</div>
                    <div class="value">${data.stats.averagePrice.toLocaleString()}원</div>
                </div>
                <div class="stat-item">
                    <div class="label">광고 상품 수</div>
                    <div class="value">${data.stats.adStats.광고 || 0}개</div>
                </div>
                <div class="stat-item">
                    <div class="label">상위 12개 중 리뷰 100개 미만</div>
                    <div class="value">${data.stats.lowReviewCount || 0}개 (${data.stats.lowReviewPercentage || '0.0'}%)</div>
                </div>
            </div>
        </div>
    `;

    // 상품 목록 표시
    const productsHtml = data.products.map(product => `
        <div class="result-item">
            <h3>${product.name}</h3>
            <div class="price">${product.price}</div>
            <div class="delivery-info">
                <span class="delivery-badge ${getDeliveryBadgeClass(product.deliveryType.type)}">
                    ${product.deliveryType.type}
                </span>
                ${product.isAd ? '<span class="ad-badge">광고</span>' : ''}
            </div>
            <div class="rating">
                ★ ${product.rating.toFixed(1)}
                <span class="review-count">(${product.reviewCount}개)</span>
            </div>
        </div>
    `).join('');

    // 통계 정보를 먼저 표시하고 그 다음에 상품 목록 표시
    searchResults.innerHTML = statsHtml + productsHtml;
}

// Chart.js 스크립트 동적 로드
function loadChartJS() {
    return new Promise((resolve, reject) => {
        if (window.Chart) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

let trendCharts = {
    fiveYear: null,
    threeYear: null,
    oneYear: null
};

async function displayTrendCharts(keyword) {
    try {
        await loadChartJS();
        
        const trendChartsContainer = document.getElementById('coupang-trend-charts');
        trendChartsContainer.style.display = 'block';

        // 기존 차트 제거
        Object.values(trendCharts).forEach(chart => {
            if (chart) chart.destroy();
        });

        // 트렌드 데이터 가져오기
        const trendData = await window.coupangAPI.getTrend(keyword);

        // 5년 차트
        trendCharts.fiveYear = new Chart(document.getElementById('trendChart5Y'), {
            type: 'line',
            data: {
                labels: trendData.fiveYear.data.map(item => item.period),
                datasets: [{
                    label: `${trendData.fiveYear.title} 검색량 (5년)`,
                    data: trendData.fiveYear.data.map(item => item.ratio),
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1,
                    fill: true,
                    backgroundColor: 'rgba(75, 192, 192, 0.2)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: '5년간 월별 검색 트렌드',
                        font: { size: 14 }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '검색량 (%)'
                        }
                    }
                }
            }
        });

        // 3년 차트
        trendCharts.threeYear = new Chart(document.getElementById('trendChart3Y'), {
            type: 'line',
            data: {
                labels: trendData.threeYear.data.map(item => item.period),
                datasets: [{
                    label: `${trendData.threeYear.title} 검색량 (3년)`,
                    data: trendData.threeYear.data.map(item => item.ratio),
                    borderColor: 'rgb(255, 99, 132)',
                    tension: 0.1,
                    fill: true,
                    backgroundColor: 'rgba(255, 99, 132, 0.2)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: '3년간 월별 검색 트렌드',
                        font: { size: 14 }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '검색량 (%)'
                        }
                    }
                }
            }
        });

        // 1년 차트
        trendCharts.oneYear = new Chart(document.getElementById('trendChart1Y'), {
            type: 'line',
            data: {
                labels: trendData.oneYear.data.map(item => item.period),
                datasets: [{
                    label: `${trendData.oneYear.title} 검색량 (1년)`,
                    data: trendData.oneYear.data.map(item => item.ratio),
                    borderColor: 'rgb(54, 162, 235)',
                    tension: 0.1,
                    fill: true,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: '1년간 월별 검색 트렌드',
                        font: { size: 14 }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '검색량 (%)'
                        }
                    }
                }
            }
        });

    } catch (error) {
        console.error('트렌드 차트 표시 중 오류:', error);
        document.getElementById('coupang-trend-charts').style.display = 'none';
    }
}

function displayKeywordStats(data, searchKeyword) {
    const container = document.getElementById('coupang-keyword-stats');
    const tbody = document.getElementById('keyword-stats-body');
    
    container.style.display = 'block';
    
    // 검색 키워드 데이터 찾기
    const searchKeywordData = data.find(item => item.keyword === searchKeyword);
    
    // 검색 키워드를 제외한 나머지 데이터
    const otherKeywords = data.filter(item => item.keyword !== searchKeyword);
    
    // 나머지 키워드를 총 검색량 기준으로 내림차순 정렬
    const sortedOtherKeywords = [...otherKeywords].sort((a, b) => b.totalCount - a.totalCount);
    
    // 테이블 내용 생성
    let rows = '';
    
    // 검색 키워드가 있는 경우 상단에 표시
    if (searchKeywordData) {
        rows += `
            <tr class="search-keyword-row">
                <td><strong>${searchKeywordData.keyword}</strong> (검색어)</td>
                <td>${searchKeywordData.pcCount.toLocaleString()}</td>
                <td>${searchKeywordData.mobileCount.toLocaleString()}</td>
                <td>${searchKeywordData.totalCount.toLocaleString()}</td>
                <td>${searchKeywordData.competition || '-'}</td>
                <td>${searchKeywordData.averageBid ? searchKeywordData.averageBid.toLocaleString() + '원' : '-'}</td>
            </tr>
            <tr class="separator-row">
                <td colspan="6"><hr></td>
            </tr>
        `;
    }
    
    // 나머지 키워드 표시
    rows += sortedOtherKeywords.map(item => `
        <tr>
            <td>${item.keyword}</td>
            <td>${item.pcCount.toLocaleString()}</td>
            <td>${item.mobileCount.toLocaleString()}</td>
            <td>${item.totalCount.toLocaleString()}</td>
            <td>${item.competition || '-'}</td>
            <td>${item.averageBid ? item.averageBid.toLocaleString() + '원' : '-'}</td>
        </tr>
    `).join('');
    
    tbody.innerHTML = rows;
} 