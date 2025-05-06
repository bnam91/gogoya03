// window.mongo 사용
export class ScreeningManager {
    constructor() {
        this.mongo = window.api;
        this.currentPage = 1;
        this.itemsPerPage = 1000; // 충분히 큰 값으로 설정
        this.viewMode = 'brand'; // 'brand', 'item', 'influencer'
        this.searchTerm = '';
        this.selectedCategories = [];
        this.selectedViews = null;
        this.selectedPickStatus= null;
        this.data = [];
        this.filteredData = [];
        this.categories = [
            "🍽주방용품&식기",
            "🛋생활용품&가전",
            "🥦식품&건강식품",
            "🧴뷰티&헬스",
            "👶유아&교육",
            "👗의류&잡화",
            "🚗기타"
        ];

        this.renderedCount = 0;
        this.batchSize = 50;
        this.currentList = [];              // 카드 데이터
        this.currentRenderFunction = null; // 렌더링 함수
    }

    init = async () => {
        console.log("스크리닝 초기화 시작");
        //console.log("MongoDB 객체:", this.mongo);
        try {
            console.log("요소들 렌더링 시작");
            this.viewMode = 'brand';
            const container = document.getElementById('screening-content-container');
            container.innerHTML = `
            <div id="screening-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
            <div id="scroll-sentinel" style="height: 1px;"></div>
            `;
            await this.loadScreeningData();
            this.setupEventListeners();
            this.setupViewModeButtons();
            this.setupFilters();
        } catch (error) {
            console.error("스크리닝 초기화 중 오류:", error);
            this.loadFallbackData();
        }
    }

    setupEventListeners = () => {
        if (this.eventListenersAttached) return; // 이미 걸었으면 또 안 걸기
        this.eventListenersAttached = true;

        document.addEventListener('click', (e) => {
            console.log('clicked e.target : ', e.target);
            // 인스타그램 링크 클릭 시 이벤트 버블링 중단
            if (e.target.closest('a[href*="instagram.com"]')) {
                return;
            }

            const dataItem = e.target.closest('.data-item');
            if (dataItem) {
                console.log('brand card');
                const brandName = dataItem.dataset.brand;
                const itemName = dataItem.dataset.item;
                this.showDetailInfo(brandName, itemName);
            }

            const brandCard = e.target.closest('.brand-card');
            if (!brandCard) return;

            const clickedBrandNameEl = brandCard.querySelector('.brand-name');
            if (!clickedBrandNameEl) return;

            const clickedBrandName = clickedBrandNameEl.textContent.trim();

            // 모든 .brand-card 들을 순회
            const allBrandCards = document.querySelectorAll('.brand-card');
            allBrandCards.forEach(card => {
                if (card === brandCard) return; // 클릭한 카드면 무시

                const brandNameEl = card.querySelector('.brand-name');
                if (!brandNameEl) return;

                const thisBrandName = brandNameEl.textContent.trim();

                if (thisBrandName === clickedBrandName) {
                    // 동일한 brandName을 가진 다른 카드면 toggle만 적용
                    brandNameEl.classList.toggle('selected');
                    card.classList.toggle('selected');
                }
            });

            // 클릭된 카드에만 update 함수 호출
            const isSelected = clickedBrandNameEl.classList.toggle('selected');
            brandCard.classList.toggle('selected');
            this.updateBrandVerification(clickedBrandName, isSelected);

        });
    }

    // 브랜드 검증 상태 업데이트 함수
    updateBrandVerification = async (brandName, isSelected) => {
        try {
            const verificationStatus = isSelected ? "pick" : "yet";
            console.log('verificationStatus : ', verificationStatus);
            const result = await window.api.updateBrandVerification(brandName, verificationStatus);
            if (result.matchedCount === 0) {
                console.log(`브랜드 '${brandName}'에 대한 정보를 찾을 수 없습니다.`);
            } else {
                console.log(`브랜드 '${brandName}'의 검증 상태가 '${verificationStatus}'로 업데이트되었습니다.`);
            }
        } catch (error) {
            console.error('브랜드 검증 상태 업데이트 중 오류:', error);
        }
    }

    setupViewModeButtons = () => {
        const viewModeButtons = document.querySelectorAll('.view-mode-btn');
        viewModeButtons.forEach(button => {
            button.addEventListener('click', () => {
                // 모든 버튼에서 active 클래스 제거
                viewModeButtons.forEach(btn => btn.classList.remove('active'));
                // 클릭된 버튼에 active 클래스 추가
                button.classList.add('active');

                const mode = button.dataset.mode;
                this.setViewMode(mode);
            });
        });
    }

    setupFilters = () => {
        // 검색어 필터
        const searchInput = document.getElementById('screening-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
            });
        }

        // 카테고리 필터
        const categorySelect = document.querySelector('.filter-select');
        const categoryOptions = document.querySelector('.filter-options');
        const categoryCheckboxes = document.querySelectorAll('.filter-option input[type="checkbox"]');

        if (categorySelect) {
            // 드롭다운 토글
            categorySelect.addEventListener('click', () => {
                categoryOptions.classList.toggle('show');
            });

            // 체크박스 변경 이벤트
            categoryCheckboxes.forEach(checkbox => {
                checkbox.addEventListener('change', () => {
                    this.updateSelectedCategories();
                    this.updateSelectedItemsDisplay();
                });
            });
        }

        // 릴스뷰 필터
        const viewsFilter = document.getElementById('views-filter'); 
        const viewsSelect = viewsFilter.querySelector('.filter-select');
        const viewsOptions = viewsFilter.querySelector('.filter-options');
        const viewsRadios = viewsFilter.querySelectorAll('.filter-option input[type="radio"]');

        if (viewsSelect) {
            // 드롭다운 토글
            viewsSelect.addEventListener('click', () => {
                viewsOptions.classList.toggle('show');
            });

            // 라디오 버튼 변경 이벤트
            viewsRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    this.selectedViews = radio.value;
                    this.updateSelectedViewsDisplay();
                });
            });
        }

        // 픽 상태 필터
        const pickStatusFilter = document.getElementById('pick-filter');
        const pickStatusSelect = pickStatusFilter.querySelector('.filter-select');
        const pickStatusOptions = pickStatusFilter.querySelector('.filter-options');
        const pickStatusRadios = pickStatusFilter.querySelectorAll('.filter-option input[type="radio"]');

        if (pickStatusSelect) {
            // 드롭다운 토글
            pickStatusSelect.addEventListener('click', () => {
                pickStatusOptions.classList.toggle('show');
            });

            // 라디오 버튼 변경 이벤트
            pickStatusRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    this.selectedPickStatus = radio.value;
                    this.updateSelectedPickStatusDisplay();
                });
            });
        }

        // 필터 적용 버튼
        const applyButton = document.getElementById('screening-apply');
        if (applyButton) {
            applyButton.addEventListener('click', () => {
                console.log('필터 적용 버튼 클릭');
                this.applyFilters();
            });
        } else {
            console.error('필터 적용 버튼을 찾을 수 없습니다.');
        }

        // 필터 초기화 버튼
        const resetButton = document.getElementById('screening-reset');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.resetFilters();
            });
        }

        // 문서 클릭 시 드롭다운 닫기
        document.addEventListener('click', (e) => {
            if (!categorySelect?.contains(e.target) && !categoryOptions?.contains(e.target)) {
                categoryOptions?.classList.remove('show');
            }
            if (!viewsSelect?.contains(e.target) && !viewsOptions?.contains(e.target)) {
                viewsOptions?.classList.remove('show');
            }
        });
    }

    updateSelectedCategories = () => {
        this.selectedCategories = Array.from(
            document.querySelectorAll('.filter-option input[type="checkbox"]:checked')
        ).map(checkbox => checkbox.value);
    }

    updateSelectedItemsDisplay = () => {
        const selectedItems = document.querySelector('.selected-items');
        if (this.selectedCategories.length === 0) {
            selectedItems.textContent = '카테고리 선택';
        } else {
            selectedItems.textContent = this.selectedCategories.join(', ');
        }
    }

    updateSelectedViewsDisplay = () => {
        const viewsFilter = document.getElementById('views-filter');
        const viewsSelect = viewsFilter.querySelector('.filter-select');
        const viewsRadios = viewsFilter.querySelectorAll('.filter-option input[type="radio"]');
        const selectedViews = viewsSelect.querySelector('.selected-items');
    
        if (this.selectedViews) {
            const selectedRadio = Array.from(viewsRadios).find( 
                radio => radio.value === this.selectedViews
            );
            if (selectedRadio) {
                const label = selectedRadio.parentElement;
                selectedViews.textContent = label.textContent.trim();
            }
        } else {
            selectedViews.textContent = '릴스뷰 선택';
        }
    }
    

    // 픽 상태 업데이트
    updateSelectedPickStatusDisplay = () => {
        const pickStatusFilter = document.getElementById('pick-filter');
        const pickStatusSelect = pickStatusFilter.querySelector('.filter-select');
        const pickStatusRadios = pickStatusFilter.querySelectorAll('.filter-option input[type="radio"]');
        const selectedPickStatus = pickStatusSelect.querySelector('.selected-items');
    
        if (this.selectedPickStatus) {
            const selectedRadio = Array.from(pickStatusRadios).find(
                radio => radio.value === this.selectedPickStatus
            );
            if (selectedRadio) {
                const label = selectedRadio.parentElement;
                selectedPickStatus.textContent = label.textContent.trim();
            }
        } else {
            selectedPickStatus.textContent = '픽 상태 선택';
        }
    }

    applyFilters = async () => {
        // 로딩 토스트 메시지 표시
        const toast = document.createElement('div');
        toast.className = 'toast-message loading';
        toast.innerHTML = `
            <span class="toast-icon">⌛</span>
            <span class="toast-text">필터를 적용하는 중...</span>
        `;
        document.body.appendChild(toast);

        try {
            const allBrands = [...new Set(this.data.map(item => item.brand))];
            const map = await window.api.fetchBrandVerificationStatus(allBrands);
            this.brandVerificationMap = map;

            let result = this.data;

            // 카테고리 필터
            if (this.selectedCategories.length > 0) {
                console.log("카테고리 필터 적용");
                result = result.filter(item => this.selectedCategories.includes(item.item_category));
            }

            // 검색어 필터
            if (this.searchTerm) {
                console.log("검색어 필터 적용");
                const term = this.searchTerm.toLowerCase();
                result = result.filter(item =>
                    item.brand.toLowerCase().includes(term) ||
                    item.item.toLowerCase().includes(term) ||
                    item.author.toLowerCase().includes(term) ||
                    (item.clean_name && item.clean_name.toLowerCase().includes(term))
                );
            }

            // 릴스뷰 필터
            if (this.selectedViews) {
                console.log("릴스뷰 필터 적용");
                const [min, max] = this.selectedViews.split('-').map(Number);

                // clean_name 목록 추출
                const cleanNames = result.map(item => item.clean_name || item.author);

                // IPC로 인플루언서 조회수 데이터 요청
                console.log("인플루언서 조회수 데이터 요청");
                const influencerDataList = await window.api.fetchInfluencerViews(cleanNames);
                console.log("인플루언서 조회수 데이터 요청 완료");
                console.log("인플루언서 조회수 데이터 요청 결과 크기:", influencerDataList.length);

                // 맵으로 빠르게 접근 가능하게 가공
                const influencerMap = new Map(
                    influencerDataList.map(data => [data.clean_name, data["reels_views(15)"] || 0])
                );
                console.log("influencerMap:", influencerMap);

                // 결과에 조회수 붙이기
                const itemsWithInfluencerInfo = result.map(item => ({
                    ...item,
                    reelsViews: influencerMap.get(item.clean_name || item.author) || 0
                }));
                console.log("itemsWithInfluencerInfo:", itemsWithInfluencerInfo);

                // 조회수 기준으로 필터링
                result = itemsWithInfluencerInfo.filter(item => {
                    const views = item.reelsViews;

                    if (max === undefined) {
                        // "100만 이상" 케이스
                        return views >= min;
                    } else {
                        // 일반 구간 케이스
                        return views >= min && views < max;
                    }
                });
            }

            // 픽 상태 필터
            if (this.selectedPickStatus === 'pick') {
                console.log("picked 필터 적용");
                if (this.brandVerificationMap) {
                    result = result.filter(item => this.brandVerificationMap.get(item.brand) === "pick");
                }
            } else if (this.selectedPickStatus === 'yet') {
                console.log("yet 필터 적용");
                if (this.brandVerificationMap) {
                    result = result.filter(item => this.brandVerificationMap.get(item.brand) !== "pick");
                }
            }
            console.log("result after pick status filter : ", result);

            this.filteredData = result;

            // 필터링 결과 카운트 업데이트
            const totalCount = document.getElementById('screening-total-count');
            const filteredCount = document.getElementById('screening-filtered-count');

            if (totalCount && filteredCount) {
                totalCount.textContent = this.data.length;
                filteredCount.textContent = result.length;
            }

            await this.renderContent();

            // 성공 토스트 메시지로 변경
            toast.className = 'toast-message success';
            toast.innerHTML = `
                <span class="toast-icon">✓</span>
                <span class="toast-text">필터가 적용되었습니다.</span>
            `;
        } catch (error) {
            console.error('필터 적용 중 오류:', error);
            // 에러 토스트 메시지로 변경
            toast.className = 'toast-message error';
            toast.innerHTML = `
                <span class="toast-icon">✕</span>
                <span class="toast-text">필터 적용 중 오류가 발생했습니다.</span>
            `;
        } finally {
            // 3초 후 토스트 메시지 제거
            setTimeout(() => {
                toast.classList.add('fade-out');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    }

    resetFilters = async () => {
        // 로딩 토스트 메시지 표시
        const toast = document.createElement('div');
        toast.className = 'toast-message loading';
        toast.innerHTML = `
            <span class="toast-icon">⌛</span>
            <span class="toast-text">필터를 초기화하는 중...</span>
        `;
        document.body.appendChild(toast);

        try {
            // 모든 체크박스 해제
            document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = false;
            });

            // 라디오 버튼 초기화
            document.querySelectorAll('input[type="radio"]').forEach(radio => {
                radio.checked = false;
            });

            // 검색어 초기화
            const searchInput = document.getElementById('screening-search');
            if (searchInput) {
                searchInput.value = '';
            }

            // 선택된 값 초기화
            this.selectedCategories = [];
            this.selectedViews = null;
            this.selectedPickStatus = null;
            this.searchTerm = '';

            // 디스플레이 텍스트 초기화
            this.updateSelectedCategories();
            this.updateSelectedViewsDisplay();
            this.updateSelectedPickStatusDisplay();

            // 데이터 초기화
            this.filteredData = this.data;

            // 필터링 결과 카운트 업데이트
            const totalCount = document.getElementById('screening-total-count');
            const filteredCount = document.getElementById('screening-filtered-count');

            if (totalCount && filteredCount) {
                totalCount.textContent = this.data.length;
                filteredCount.textContent = this.data.length;
            }

            await this.renderContent();

            // 성공 토스트 메시지로 변경
            toast.className = 'toast-message success';
            toast.innerHTML = `
                <span class="toast-icon">✓</span>
                <span class="toast-text">필터가 초기화되었습니다.</span>
            `;
        } catch (error) {
            console.error('필터 초기화 중 오류:', error);
            // 에러 토스트 메시지로 변경
            toast.className = 'toast-message error';
            toast.innerHTML = `
                <span class="toast-icon">✕</span>
                <span class="toast-text">필터 초기화 중 오류가 발생했습니다.</span>
            `;
        } finally {
            // 3초 후 토스트 메시지 제거
            setTimeout(() => {
                toast.classList.add('fade-out');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    }

    setViewMode = async (mode) => {
        this.viewMode = mode;

        // 로딩 토스트 메시지 표시
        const toast = document.createElement('div');
        toast.className = 'toast-message loading';
        toast.innerHTML = `
            <span class="toast-icon">⌛</span>
            <span class="toast-text">데이터를 불러오는 중...</span>
        `;
        document.body.appendChild(toast);

        try {
            await this.renderContent();
        } finally {
            // 로딩 토스트 메시지 제거
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }
    }

    // 스크리닝 데이터 로드
    loadScreeningData = async () => {
        try {
            try {
                const data = await window.api.fetchScreeningData();
                console.log("로드된 데이터 수:", data.length);

                if (data.length > 0) {
                    this.data = data;
                    this.filteredData = data;
                    
                    // 데이터 갯수 업데이트
                    const totalCount = document.getElementById('screening-total-count');
                    const filteredCount = document.getElementById('screening-filtered-count');
                    if (totalCount && filteredCount) {
                        totalCount.textContent = data.length;
                        filteredCount.textContent = data.length;
                    }
                    
                    this.renderContent();
                } else {
                    console.log("데이터가 없습니다.");
                    this.loadFallbackData();
                }
                return;
            } catch (err) {
                console.error("MongoDB 쿼리 오류:", err);
                throw err;
            }
        } catch (error) {
            console.error('MongoDB 데이터 로드 중 오류:', error);
            this.loadFallbackData();
        }
    }

    // 대체 데이터 로드
    loadFallbackData = () => {
        console.log("대체 데이터 사용");
        const fallbackData = [
            {
                _id: '1',
                brand: "브랜드1",
                item: "아이템1",
                item_category: "카테고리1",
                author: "인플루언서1",
                clean_name: "클린네임1",
                crawl_date: new Date().toISOString(),
                item_feed_link: "https://instagram.com"
            },
            {
                _id: '2',
                brand: "브랜드2",
                item: "아이템2",
                item_category: "카테고리2",
                author: "인플루언서2",
                clean_name: "클린네임2",
                crawl_date: new Date().toISOString(),
                item_feed_link: "https://instagram.com"
            }
        ];
        this.data = fallbackData;
        this.filteredData = fallbackData;
        this.renderContent();
    }

    // 데이터 그룹화
    groupByBrand = () => {
        const grouped = {};
        this.filteredData.forEach(item => {
            if (!grouped[item.brand]) {
                grouped[item.brand] = [];
            }
            grouped[item.brand].push(item);
        });
        return grouped;
    }

    groupByItem = () => {
        const grouped = {};
        this.filteredData.forEach(item => {
            if (!grouped[item.item]) {
                grouped[item.item] = [];
            }
            grouped[item.item].push(item);
        });
        return grouped;
    }

    groupByInfluencer = () => {
        const grouped = {};
        this.filteredData.forEach(item => {
            if (!grouped[item.author]) {
                grouped[item.author] = [];
            }
            grouped[item.author].push(item);
        });
        return grouped;
    }

    // 날짜 포맷팅
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    renderNextBatch = () => {
        const grid = document.getElementById('screening-grid');
        if (!grid || !this.currentList) return;

        const start = this.renderedCount;
        const end = Math.min(start + this.batchSize, this.currentList.length);

        const html = this.currentRenderFunction(this.currentList, start, end);
        grid.insertAdjacentHTML('beforeend', html);

        this.renderedCount = end;

        if (this.renderedCount >= this.currentList.length) {
            this.scrollObserver?.disconnect(); // 옵셔널 체이닝으로 깔끔하게
        }
    };

    initIntersectionObserver = () => {
        const sentinel = document.getElementById('scroll-sentinel');
        if (!sentinel) return;

        const options = {
            root: null,
            rootMargin: '0px',
            threshold: 1.0
        };

        this.scrollObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.renderNextBatch();
                }
            });
        }, options);

        this.scrollObserver.observe(sentinel);
    };


    // 콘텐츠 렌더링
    renderContent = async () => {

        const contentContainer = document.getElementById('screening-content-container');
        if (!contentContainer) return;

        this.renderedCount = 0;
        if (this.viewMode === 'brand') {
            const grouped = this.groupByBrand();
            this.currentList = await this.prepareBrandList(grouped);
            this.currentRenderFunction = this.renderBrandCards;
        } else if (this.viewMode === 'item') {
            const grouped = this.groupByItem();
            this.currentList = await this.prepareItemList(grouped);
            this.currentRenderFunction = this.renderItemCards;
        } else {
            const grouped = this.groupByInfluencer();
            this.currentList = await this.prepareInfluencerList(grouped);
            this.currentRenderFunction = this.renderInfluencerCards;
        }

        contentContainer.innerHTML = `
            <div id="screening-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
            <div id="scroll-sentinel" style="height: 1px;"></div>
        `;

        this.renderNextBatch();          // 첫 배치
        this.initIntersectionObserver(); // 감시 시작
    }

    // 브랜드별 뷰 준비 (데이터 정리)
    prepareBrandList = async (groupedByBrand) => {
        // 전체 인플루언서 이름 수집
        const allNames = Object.values(groupedByBrand).flat().map(item => item.clean_name || item.author);
        const uniqueNames = [...new Set(allNames)];

        const influencerList = await window.api.fetchInfluencerDataMany(uniqueNames);
        const influencerMap = new Map(influencerList.map(doc => [doc.clean_name, doc]));

        // 브랜드 검증 정보 일괄 로드
        const allBrands = [...new Set(Object.values(groupedByBrand).flat().map(item => item.brand))];
        const brandVerificationMap = await window.api.fetchBrandVerificationStatus(allBrands);

        const brandList = Object.entries(groupedByBrand).map(([brand, items]) => {
            const enrichedItems = items.map(item => {
                const cleanName = item.clean_name || item.author;
                const influencer = influencerMap.get(cleanName);
                return {
                    ...item,
                    reelsViews: influencer ? influencer["reels_views(15)"] || 0 : 0,
                    grade: influencer ? influencer.grade || 'N/A' : 'N/A',
                    isVerifiedBrand: brandVerificationMap.get(brand) === "pick"
                };
            });

            return {
                brand,
                items: enrichedItems,
                isVerifiedBrand: brandVerificationMap.get(brand) === "pick"
            };
        });

        return brandList;
    };

    // 브랜드 카드 HTML 렌더링 (start~end 범위)
    renderBrandCards = (brandList, start, end) => {
        return brandList.slice(start, end).map(({ brand, items, isVerifiedBrand }) => `
                <div class="bg-white rounded-lg shadow-md p-4 overflow-hidden brand-card ${isVerifiedBrand ? 'selected' : ''}">
                    <div class="flex items-center mb-3 pb-2 border-b border-gray-200">
                        <h3 class="text-lg font-semibold truncate brand-name ${isVerifiedBrand ? 'selected' : ''}" style="cursor: pointer;order: 0;">${brand}</h3>
                        <span class="ml-auto bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">
                            ${items.length}
                        </span>
                    </div>
                    <div class="overflow-y-auto max-h-64">
                        ${items.map(item => `
                            <div class="mb-3 pb-2 border-b border-gray-100 last:border-0 ">
                                <div class="flex items-center">
                                    <p class="text-sm font-medium">${item.item}</p>
                                </div>
                                <div class="flex items-center mt-1">
                                    <p class="text-sm text-gray-600">
                                        ${item.clean_name || item.author}
                                    </p>
                                    <span class="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">
                                        조회수: ${item.reelsViews.toLocaleString()}
                                    </span>
                                    <span class="ml-2 bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded">
                                        등급: ${item.grade}
                                    </span>
                                    <a 
                                        href="${item.item_feed_link}" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        class="ml-auto text-pink-500 hover:text-pink-700"
                                    >
                                        <i class="fab fa-instagram"></i>
                                    </a>
                                </div>
                                <p class="text-xs text-gray-500 mt-1">
                                    ${this.formatDate(item.crawl_date)}
                                </p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');
    };

    // 브랜드별 뷰 렌더링 (무한 스크롤 지원)
    renderBrandView = async (groupedByBrand) => {
        this.currentList = await this.prepareBrandList(groupedByBrand);
        this.currentRenderFunction = this.renderBrandCards;

        const container = document.getElementById('screening-content-container');
        if (!container) return;

        container.innerHTML = `
            <div id="screening-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
            <div id="scroll-sentinel" style="height: 1px;"></div>
        `;

        this.renderedCount = 0;
        this.renderNextBatch();
        this.initIntersectionObserver();
        return ''; // return 빈 문자열로 호출자 렌더 중복 방지
    };

    // 상품별 목록 준비 (무한스크롤용)
    prepareItemList = async (groupedByItem) => {
        if (!groupedByItem || typeof groupedByItem !== 'object') {
            console.error('❌ prepareItemList: 잘못된 groupedByItem');
            return [];
        }

        // 전체 clean_name 목록 수집
        const allNames = Object.values(groupedByItem).flat().map(product => product.clean_name || product.author);
        const uniqueNames = [...new Set(allNames)];

        // 인플루언서 정보 한번에 로드
        const influencerList = await window.api.fetchInfluencerDataMany(uniqueNames);
        const influencerMap = new Map(influencerList.map(doc => [doc.clean_name, doc]));

        // 브랜드 검증 정보 일괄 로드
        const allBrands = [...new Set(Object.values(groupedByItem).flat().map(item => item.brand))];
        const brandVerificationMap = await window.api.fetchBrandVerificationStatus(allBrands);


        // 상품별 products 가공
        const allItems = Object.keys(groupedByItem).map(item => {
            const products = groupedByItem[item].map(product => {
                const cleanName = product.clean_name || product.author;
                const influencer = influencerMap.get(cleanName);

                return {
                    ...product,
                    isVerifiedBrand: brandVerificationMap.get(product.brand) === "pick",
                    reelsViews: influencer?.["reels_views(15)"] ?? 0,
                    grade: influencer?.grade ?? 'N/A'
                };
            });

            return { item, products };
        });

        return allItems;
    }

    //상품별 카드
    renderItemCards = (list, start, end) => {
        return list.slice(start, end).map(({ item, products }) => `
            <div class="bg-white rounded-lg shadow-md p-4 overflow-hidden">
                <div class="flex items-center mb-3 pb-2 border-b border-gray-200">
                    <h3 class="text-lg font-semibold truncate">${item}</h3>
                    <span class="ml-auto bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded">
                        ${products.length}
                    </span>
                </div>
                <div class="overflow-y-auto max-h-64">
                    ${products.map(product => `
                        <div class="mb-3 pb-2 border-b border-gray-100 last:border-0 brand-card ${product.isVerifiedBrand ? 'selected' : ''}">
                            <div class="flex items-center">
                                <p class="text-sm font-medium brand-name ${product.isVerifiedBrand ? 'selected' : ''}">${product.brand}</p>
                            </div>
                            <div class="flex items-center mt-1">
                                <p class="text-sm text-gray-600 ">${product.clean_name || product.author}</p>
                                <span class="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">
                                    조회수: ${(product.reelsViews || 0).toLocaleString()}
                                </span>
                                <span class="ml-2 bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded">
                                    등급: ${product.grade || 'N/A'}
                                </span>
                                <a href="${product.item_feed_link}" target="_blank" rel="noopener noreferrer" class="ml-auto text-pink-500 hover:text-pink-700">
                                    <i class="fab fa-instagram"></i>
                                </a>
                            </div>
                            <p class="text-xs text-gray-500 mt-1">${this.formatDate(product.crawl_date)}
                            </p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }


    // 상품별 뷰 렌더링 (무한스크롤 지원)
    renderItemView = async (groupedByItem) => {
        this.currentList = await this.prepareItemList(groupedByItem);  // ✅ 배열 보장
        this.currentRenderFunction = this.renderItemCards;  // ✅ 카드 렌더러 세팅

        const container = document.getElementById('screening-content-container');
        if (!container) return;

        container.innerHTML = `
            <div id="screening-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
            <div id="scroll-sentinel" style="height: 1px;"></div>
        `;

        this.renderedCount = 0;
        this.renderNextBatch();
        this.initIntersectionObserver();
        return '';
    }

    // 인플루언서별 목록 준비 (무한스크롤용)
    prepareInfluencerList = async (groupedByInfluencer) => {
        if (!groupedByInfluencer || typeof groupedByInfluencer !== 'object') {
            console.error('❌ prepareInfluencerList: 잘못된 groupedByInfluencer');
            return [];
        }

        try {
            // 전체 clean_name 목록 수집
            const allNames = Object.values(groupedByInfluencer).flat().map(item => item.clean_name || item.author);
            const uniqueNames = [...new Set(allNames)];

            // 인플루언서 정보 일괄 로드
            const rawList = await window.api.fetchInfluencerDataMany(uniqueNames);
            const influencerDataMap = new Map(rawList.map(doc => [doc.clean_name, doc]));

            // 브랜드 검증 정보 일괄 로드
            const allBrands = [...new Set(Object.values(groupedByInfluencer).flat().map(item => item.brand))];
            const brandVerificationMap = await window.api.fetchBrandVerificationStatus(allBrands);
            console.log('brandVerificationMap', brandVerificationMap);
            console.log('brandVerificationMap type:', typeof brandVerificationMap);
            console.log('brandVerificationMap keys:', Object.keys(brandVerificationMap));
            console.log('brandVerificationMap entries:', Object.entries(brandVerificationMap));

            console.log('brandVerificationMap.get(쏘랩)', brandVerificationMap.get("쏘랩"));
            console.log('brandVerificationMap.get(켄트로얄)', brandVerificationMap.get("켄트로얄"));

            // 인플루언서별로 정리
            const sortedInfluencers = Object.entries(groupedByInfluencer).map(([influencer, items]) => {
                const enrichedItems = items.map(item => {
                    const cleanName = item.clean_name || item.author;
                    const data = influencerDataMap.get(cleanName) || {};

                    if (cleanName === '꿀양') {
                        console.log('cleanName:', cleanName)
                        console.log('item.brand:', item.brand);
                        console.log('isVerifiedBrand:', brandVerificationMap.get(item.brand));
                    }
                    return {
                        ...item,
                        cleanName,
                        reelsViews: data["reels_views(15)"] || 0,
                        grade: data.grade || 'N/A',
                        isVerifiedBrand: brandVerificationMap.get(item.brand) === "pick" // Map.get() 사용
                    };
                });

                return {
                    influencer,                           // 인플루언서명 (author)
                    cleanName: enrichedItems[0]?.cleanName || influencer,
                    reelsViews: enrichedItems[0]?.reelsViews || 0,
                    grade: enrichedItems[0]?.grade || 'N/A',
                    items: enrichedItems                  // products 목록
                };
            });

            // 조회수 기준 내림차순 정렬
            sortedInfluencers.sort((a, b) => b.reelsViews - a.reelsViews);

            return sortedInfluencers;
        } catch (error) {
            console.error('❌ prepareInfluencerList error:', error);
            return [];
        }
    }

    // 인플루언서별 카드 렌더링
    renderInfluencerCards = (list, start, end) => {
        return list.slice(start, end).map(({ influencer, cleanName, reelsViews, grade, items = [] }) => {
            const firstItem = Array.isArray(items) ? items[0] || {} : {};
            return `
                <div class="bg-white rounded-lg shadow-md p-4 overflow-hidden">
                    <div class="flex items-center mb-3 pb-2 border-b border-gray-200">
                        <div class="flex flex-col">
                            <div class="flex items-center">
                                <p class="text-lg font-semibold truncate">${cleanName || influencer}</p>
                                <a href="https://instagram.com/${influencer}" target="_blank" class="ml-2 text-pink-500 hover:text-pink-700">
                                    <i class="fab fa-instagram"></i>
                                </a>
                            </div>
                            <div class="flex items-center mt-1">
                                <span class="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded mr-1">
                                    조회수: ${(reelsViews || 0).toLocaleString()}
                                </span>
                                <span class="bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded">
                                    등급: ${grade || 'N/A'}
                                </span>
                                <span class="ml-auto bg-purple-100 text-purple-800 text-xs font-medium px-2 py-0.5 rounded">
                                    ${items.length}
                                </span>
                            </div>
                        </div>
                    </div>
    
                    <div class="overflow-y-auto max-h-64">
                        ${Array.isArray(items) && items.length > 0
                    ? items.map(product => `
                                <div class="mb-3 pb-2 border-b border-gray-100 last:border-0 brand-card ${product.isVerifiedBrand ? 'selected' : ''}">
                                    <div class="text-sm font-medium text-gray-900 brand-name ${product.isVerifiedBrand ? 'selected' : ''}">${product.brand || '-'}</div>
                                    <div class="flex items-center mt-1">
                                        <p class="text-sm text-gray-600">${product.item || '-'}</p>
                                        <a href="${product.item_feed_link}" target="_blank" rel="noopener noreferrer" class="ml-auto text-pink-500 hover:text-pink-700">
                                            <i class="fab fa-instagram"></i>
                                        </a>
                                    </div>
                                    <div class="text-xs text-gray-500 mt-1">
                                        ${this.formatDate(product.crawl_date)}
                                    </div>
                                </div>
                            `).join('')
                    : '<div class="text-gray-400 text-sm">등록된 상품 없음</div>'
                }
                    </div>
                </div>
            `;
        }).join('');
    }


    // 인플루언서별 뷰 렌더링 (무한스크롤 지원)
    renderInfluencerView = async (influencerDataList) => {
        this.currentList = await this.prepareInfluencerList(influencerDataList);  // ✅ 배열 보장
        this.currentRenderFunction = this.renderInfluencerCards;  // ✅ 카드 렌더러 세팅

        const container = document.getElementById('screening-content-container');
        if (!container) return;

        container.innerHTML = `
        <div id="screening-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
        <div id="scroll-sentinel" style="height: 1px;"></div>
    `;

        this.renderedCount = 0;
        this.renderNextBatch();
        this.initIntersectionObserver();
        return '';
    }

    // 정렬 실패 시 기본 렌더링
    renderInfluencerViewFallback = (groupedByInfluencer) => {
        return `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${Object.keys(groupedByInfluencer).map(influencer => `
                <div class="bg-white rounded-lg shadow-md p-4 overflow-hidden">
                    <div class="flex items-center mb-3 pb-2 border-b border-gray-200">
                        <h3 class="text-lg font-semibold truncate">
                            ${groupedByInfluencer[influencer][0].clean_name || influencer}
                        </h3>
                        <a 
                            href="https://www.instagram.com/${influencer}" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            class="ml-2 text-pink-500 hover:text-pink-700"
                        >
                            <i class="fab fa-instagram"></i>
                        </a>
                        <span class="ml-auto bg-purple-100 text-purple-800 text-xs font-medium px-2 py-0.5 rounded">
                            ${groupedByInfluencer[influencer].length}
                        </span>
                    </div>
                    <div class="overflow-y-auto max-h-64">
                        ${groupedByInfluencer[influencer].map(promo => `
                            <div class="mb-3 pb-2 border-b border-gray-100 last:border-0">
                                <div class="flex items-center">
                                    <p class="text-sm font-medium">${promo.brand}</p>
                                </div>
                                <div class="flex items-center mt-1">
                                    <p class="text-sm text-gray-600">${promo.item}</p>
                                    <a 
                                        href="${promo.item_feed_link}" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        class="ml-auto text-pink-500 hover:text-pink-700"
                                    >
                                        <i class="fab fa-instagram"></i>
                                    </a>
                                </div>
                                <p class="text-xs text-gray-500 mt-1">
                                    ${this.formatDate(promo.crawl_date)}
                                </p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    }

    // 상세 정보 표시
    showDetailInfo = async (brandName, itemName) => {
        try {

            const data = await window.api.fetchItemDetails(brandName, itemName);
            // 상세 정보 표시
            const detailInfo = document.querySelector('.detail-info');
            if (detailInfo) {
                const html = `
                    <h4>${brandName} - ${itemName}</h4>
                    <div class="info-item">
                        <span class="info-label">총 등록 수:</span>
                        <span class="info-value">${data.length}건</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">카테고리:</span>
                        <span class="info-value">${data[0]?.item_category || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">인플루언서 목록:</span>
                        <div class="influencer-list">
                            ${data.map(item => `
                                <div class="influencer-item">
                                    <span>${item.author}</span>
                                    <span>${new Date(item.crawl_date).toLocaleDateString()}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
                detailInfo.innerHTML = html;
            }
        } catch (error) {
            console.error('상세 정보 로드 중 오류:', error);
        }
    }
}

// 스크리닝 매니저 인스턴스 생성
//console.log("ScreeningManager 인스턴스 생성 시작");
//window.screeningManager = new ScreeningManager();
//console.log("ScreeningManager 인스턴스 생성 완료"); 