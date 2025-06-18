/**
 * 쿠팡 크롤링 및 통계 분석 모듈
 */
export class CoupangCrawlingModule {
    constructor() {
        this.currentProducts = [];
    }

    /**
     * 쿠팡 상품 검색 및 통계 분석 실행
     * @param {string} searchQuery - 검색어
     * @returns {Promise<Object>} 검색 결과 및 통계 데이터
     */
    async executeCrawling(searchQuery) {
        console.log('쿠팡 크롤링 및 통계 작업을 포함하여 검색을 진행합니다.');
        
        // 네이버 검색광고 API용 키워드 (띄어쓰기 제거)
        const keywordForNaverAPI = searchQuery.replace(/\s+/g, '');

        // 검색, 트렌드, 키워드 통계를 병렬로 가져오기
        const [searchResult, trendResult, keywordStats] = await Promise.all([
            window.coupangAPI.search(searchQuery, {
                selector: 'li[data-sentry-component="ProductItem"]'
            }),
            window.coupangAPI.getTrend(searchQuery),
            window.coupangAPI.getKeywordStats(keywordForNaverAPI)
        ]);

        this.currentProducts = searchResult.products;
        console.log('검색 결과 상품 목록:', this.currentProducts);
        
        const initialStats = this.calculateStats(this.currentProducts);
        console.log('초기 통계 계산 결과:', initialStats);
        
        return {
            products: this.currentProducts,
            stats: initialStats,
            trendData: trendResult,
            keywordStats: keywordStats
        };
    }

    /**
     * 상품 통계 계산
     * @param {Array} products - 상품 목록
     * @returns {Object} 통계 데이터
     */
    calculateStats(products) {
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

    /**
     * 상품 필터링
     * @param {string} filterType - 필터 타입
     * @returns {Array} 필터링된 상품 목록
     */
    filterProducts(filterType) {
        console.log('filterProducts 시작 - 필터 타입:', filterType);
        console.log('현재 상품 목록:', this.currentProducts);
        
        let filteredProducts = [...this.currentProducts];

        switch (filterType) {
            case 'rocket':
                filteredProducts = this.currentProducts.filter(product => 
                    product.deliveryType.type === '로켓배송' || 
                    product.deliveryType.type === '판매자로켓'
                );
                break;
            case 'ad':
                filteredProducts = this.currentProducts.filter(product => product.isAd);
                break;
            // 'all'인 경우 필터링하지 않음
        }

        console.log('필터링된 상품 목록:', filteredProducts);
        return filteredProducts;
    }

    /**
     * 현재 상품 목록 반환
     * @returns {Array} 현재 상품 목록
     */
    getCurrentProducts() {
        return this.currentProducts;
    }

    /**
     * 현재 상품 목록 설정
     * @param {Array} products - 상품 목록
     */
    setCurrentProducts(products) {
        this.currentProducts = products;
    }
}

/**
 * 배송 유형별 배지 클래스 반환
 * @param {string} deliveryType - 배송 유형
 * @returns {string} 배지 클래스명
 */
export function getDeliveryBadgeClass(deliveryType) {
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