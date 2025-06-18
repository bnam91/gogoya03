/**
 * 쿠팡 페이지 관리를 위한 JavaScript 모듈
 */
import { CoupangCrawlingModule, getDeliveryBadgeClass } from '../../classes/tab4/coupangCrawlingModule.js';

export function initPage() {
    console.log('쿠팡 페이지 초기화');
    initEventListeners();
}

// 쿠팡 크롤링 모듈 인스턴스
const coupangCrawlingModule = new CoupangCrawlingModule();

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

        // 체크박스 상태 확인
        const includeCrawling = document.getElementById('coupang-crawl-option').checked;

        try {
            // 로딩 표시
            loadingIndicator.style.display = 'block';
            searchResults.innerHTML = '';
            filterContainer.style.display = 'none';
            document.getElementById('coupang-trend-charts').style.display = 'none';
            document.getElementById('coupang-keyword-stats').style.display = 'none';

            // 네이버 검색광고 API용 키워드 (띄어쓰기 제거)
            const keywordForNaverAPI = searchQuery.replace(/\s+/g, '');

            if (includeCrawling) {
                // 쿠팡 크롤링 모듈을 사용하여 검색 및 통계 분석
                const result = await coupangCrawlingModule.executeCrawling(searchQuery);
                
                displaySearchResults({ products: result.products, stats: result.stats });
                filterContainer.style.display = 'block';
                await displayTrendCharts(searchQuery);
                displayKeywordStats(result.keywordStats, searchQuery);
            } else {
                // 쿠팡 크롤링 및 통계 작업 제외, 네이버 기능만 실행
                console.log('쿠팡 크롤링 및 통계 작업을 제외하고 네이버 기능만 실행합니다.');
                
                // 네이버 트렌드와 키워드 통계만 가져오기
                const [trendResult, keywordStats] = await Promise.all([
                    window.coupangAPI.getTrend(searchQuery),
                    window.coupangAPI.getKeywordStats(keywordForNaverAPI)
                ]);

                // 검색 결과만 표시 (빈 결과)
                const emptyStats = {
                    rocketDeliveryPercentage: '0.0',
                    averagePrice: 0,
                    adStats: { 광고: 0, 일반: 0 },
                    deliveryStats: {},
                    lowReviewCount: 0,
                    lowReviewPercentage: '0.0'
                };
                
                displaySearchResults({ products: [], stats: emptyStats });
                
                // 크롤링을 하지 않는다는 메시지 표시
                searchResults.innerHTML = `
                    <div class="placeholder-message">
                        <h3>검색 완료</h3>
                        <p>검색어: <strong>${searchQuery}</strong></p>
                        <p>쿠팡 상품 크롤링 및 통계 분석이 비활성화되어 있습니다.</p>
                        <p>상품 정보를 확인하려면 위의 체크박스를 활성화하고 다시 검색해주세요.</p>
                    </div>
                `;

                // 네이버 기능들 실행
                await displayTrendCharts(searchQuery);
                displayKeywordStats(keywordStats, searchQuery);
            }

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
    
    // 쿠팡 크롤링 모듈을 사용하여 필터링
    const filteredProducts = coupangCrawlingModule.filterProducts(filterType);
    console.log('필터링된 상품 목록:', filteredProducts);

    // 필터링된 결과로 통계 재계산
    const stats = coupangCrawlingModule.calculateStats(filteredProducts);
    console.log('계산된 통계:', stats);

    displaySearchResults({ products: filteredProducts, stats });
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
    
    // 띄어쓰기 제거된 키워드 생성
    const keywordWithoutSpaces = searchKeyword.replace(/\s+/g, '');
    
    // 검색 키워드 데이터 찾기 (원본 키워드와 띄어쓰기 제거된 키워드 모두 확인)
    const searchKeywordData = data.find(item => 
        item.keyword === searchKeyword || 
        item.keyword === keywordWithoutSpaces ||
        item.keyword.replace(/\s+/g, '') === keywordWithoutSpaces
    );
    
    // 검색 키워드를 제외한 나머지 데이터 (원본 키워드와 띄어쓰기 제거된 키워드 모두 제외)
    const otherKeywords = data.filter(item => 
        item.keyword !== searchKeyword && 
        item.keyword !== keywordWithoutSpaces &&
        item.keyword.replace(/\s+/g, '') !== keywordWithoutSpaces
    );
    
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
    } else {
        // 검색 키워드가 데이터에 없는 경우 안내 메시지 추가
        rows += `
            <tr class="search-keyword-row">
                <td><strong>${searchKeyword}</strong> (검색어) - 데이터 없음</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
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