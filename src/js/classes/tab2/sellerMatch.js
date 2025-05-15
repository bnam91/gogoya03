import { BrandRecordsManager } from './brandRecords.js';
import { DmRecordsManager } from './dmRecords.js';
import { DmModal } from './dmModal.js';
import { SellerMatchFilter } from './sellerMatchFilter.js';
import { BrandHistoryFilter } from './brandHistoryFilter.js';

export class SellerMatchManager {
    constructor() {
        this.container = null;
        this.leftContent = null;
        this.centerContent = null;
        this.rightContent = null;
        this.influencers = [];
        this.originalInfluencers = [];
        this.filteredInfluencers = [];
        this.selectedInfluencerIds = new Set(); // 선택된 인플루언서의 ID를 저장
        this.initialized = false; // 초기화 여부를 추적하는 플래그 추가
        this.brandRecordsManager = new BrandRecordsManager();
        this.dmRecordsManager = new DmRecordsManager();
        this.dmModal = new DmModal();
        this.sellerMatchFilter = new SellerMatchFilter();
        this.sortConfig = {
            column: null,
            direction: 'asc'
        };
        this.contactSortTarget = null; // 컨택 정렬 타겟
        this.brandHistoryFilter = new BrandHistoryFilter();
    }

    init = async () => {
        console.log('셀러매칭 탭 초기화');
        if (!this.initialized) {
            this.initializeElements();
            await this.loadInfluencerData();
            this.initialized = true;
        }
        this.render();

        // 선택된 인플루언서가 있는 경우 중앙 패널 업데이트
        if (this.selectedInfluencerIds.size > 0) {
            console.log('선택된 인플루언서가 있는 경우 중앙 패널 업데이트');
            const checkedInfluencers = this.influencers.filter(influencer =>
                this.selectedInfluencerIds.has(`${influencer.username}_${influencer.clean_name}`)
            );
            this.updateCenterPanel(checkedInfluencers);
        }
    }

    initializeElements = () => {
        /*
        this.container = document.querySelector('.sellerMatch-container');
        this.leftContent = document.getElementById('sellerMatch-left-content');
        this.centerContent = document.getElementById('sellerMatch-center-content');
        this.rightContent = document.getElementById('sellerMatch-right-content');
        */
        this.container = document.querySelector('.seller-match-container');
        this.leftContent = document.getElementById('seller-match-left-content');
        this.centerContent = document.getElementById('seller-match-center-content');
        this.rightContent = document.getElementById('seller-match-right-content');

        if (!this.container || !this.leftContent || !this.centerContent || !this.rightContent) {
            console.error('셀러매칭 관련 DOM 요소를 찾을 수 없습니다.');
            return false;
        }
        return true;
    }

    loadInfluencerData = async () => {
        try {
            const newInfluencers = await window.api.fetchInfluencerDataForSellerMatch();
            const existingSelectedIds = new Set(this.selectedInfluencerIds);
            this.influencers = newInfluencers;
            this.originalInfluencers = [...newInfluencers];
            this.filteredInfluencers = [...newInfluencers];
            // 초기 순위 부여
            this.filteredInfluencers.forEach((inf, i) => inf.filteredRank = i + 1);
            this.selectedInfluencerIds = new Set();
            this.influencers.forEach(influencer => {
                const influencerId = `${influencer.username}_${influencer.clean_name}`;
                if (existingSelectedIds.has(influencerId)) {
                    this.selectedInfluencerIds.add(influencerId);
                }
            });
        } catch (error) {
            console.error('인플루언서 데이터 로드 중 오류 발생:', error);
            this.leftContent.innerHTML = '<div class="error-message">데이터를 불러오는 중 오류가 발생했습니다.</div>';
        }
    }

    render = () => {

        if (!this.initializeElements()) {
            return;
        }

        // 각 섹션 초기화
        this.renderLeftPanel();
        this.renderCenterPanel();
        this.renderRightPanel();
    }

    renderLeftPanel = () => {
        if (this.leftContent) {
            const filterHTML = `
                <div class="seller-match-filters">
                    <div class="filter-row">
                        <div class="filter-group">
                            <span class="filter-label">카테고리:</span>
                            <select id="category-filter">
                                <option value="">전체</option>
                                <option value="뷰티">뷰티</option>
                                <option value="패션">패션</option>
                                <option value="홈/리빙">홈/리빙</option>
                                <option value="푸드">푸드</option>
                                <option value="육아">육아</option>
                                <option value="건강">건강</option>
                                <option value="맛집탐방">맛집탐방</option>
                                <option value="전시/공연">전시/공연</option>
                                <option value="반려동물">반려동물</option>
                                <option value="기타">기타</option>
                            </select>
                            <input type="number" id="category-percentage" min="0" max="100" value="0">
                            <span class="percentage-label">% 이상</span>
                        </div>
                    </div>
                    <div class="filter-row">
                        <div class="filter-group">
                            <span class="filter-label">이름검색:</span>
                            <input type="text" id="name-search" placeholder="이름 또는 유저명으로 검색">
                        </div>
                    </div>
                    <div class="filter-row">
                        <div class="filter-group">
                            <span class="filter-label">릴스뷰:</span>
                            <select id="reels-views-filter">
                                <option value="">전체</option>
                                <option value="0-10000">1만 이하</option>
                                <option value="10000-50000">1만-5만</option>
                                <option value="50000-100000">5만-10만</option>
                                <option value="100000-500000">10만-50만</option>
                                <option value="500000-1000000">50만-100만</option>
                                <option value="1000000-">100만 이상</option>
                                <option value="custom">직접입력</option>
                            </select>
                            <div id="custom-reels-views" style="display: none;">
                                <input type="number" id="reels-views-min" placeholder="최소값" min="0">
                                <span>~</span>
                                <input type="number" id="reels-views-max" placeholder="최대값" min="0">
                            </div>
                        </div>
                        <div class="filter-group">
                            <input type="file" id="excel-import" accept=".xlsx,.xls" style="display: none;">
                            <button class="import-excel-button" onclick="document.getElementById('excel-import').click()">
                                <i class="fas fa-file-excel"></i> 엑셀에서 가져오기
                            </button>
                        </div>
                    </div>
                                        <div class="filter-row">
                        <div class="filter-group">
                            <span class="filter-label">총 유저수:</span>
                            <span class="total-users-count">${this.influencers.length.toLocaleString()}명</span>
                        </div>
                    </div>
                </div>
            `;

            const CATEGORY_ORDER = [
                '뷰티', '패션', '홈/리빙', '푸드', '육아', '건강', '맛집탐방', '전시/공연', '반려동물', '기타'
            ];
            const getSortIcon = (col) => {
                if (this.sortConfig.column === col) {
                    return this.sortConfig.direction === 'asc' ? 
                        '<i class="fas fa-sort-up"></i>' : 
                        '<i class="fas fa-sort-down"></i>';
                }
                return '<i class="fas fa-sort"></i>';
            };
            const getContactSortLabel = () => {
                if (!this.contactSortTarget) return '(other)';
                return `(${this.contactSortTarget})`;
            };

            const tableHTML = `
                ${filterHTML}
                <div class="influencer-table-container">
                    <table class="influencer-table">
                        <colgroup>
                            <col style="width:32px;">
                            <col style="width:65px;">
                            <col style="min-width:140px;width:160px;max-width:180px;text-align:left;">
                            <col style="min-width:100px;width:130px;max-width:180px;">
                            <col style="min-width:90px;width:90px;max-width:90px;">
                            <col style="min-width:50px;width:100px;max-width:120px;">
                        </colgroup>
                        <thead>
                            <tr>
                                <th class="checkbox-col"><input type="checkbox" id="select-all-influencers" onclick="toggleAllInfluencers(this)"></th>
                                <th class="rank-col">
                                    <div class="sort-header-content">
                                        <span>순위</span>
                                        <button class="sort-toggle" data-column="rank">
                                            ${getSortIcon('rank')}
                                        </button>
                                    </div>
                                </th>
                                <th class="name-username-header">
                                    <div class="sort-header-content">
                                        <span>이름(유저명)</span>
                                        <button class="sort-toggle" data-column="name">
                                            ${getSortIcon('name')}
                                        </button>
                                    </div>
                                </th>
                                <th class="category-header">
                                    <div class="sort-header-content">
                                        <span>카테고리</span>
                                    </div>
                                </th>
                                <th class="reels-views-header">
                                    <div class="sort-header-content">
                                        <span>릴스뷰</span>
                                        <button class="sort-toggle" data-column="reels_views">
                                            ${getSortIcon('reels_views')}
                                        </button>
                                    </div>
                                </th>
                                <th class="contact-method-header">
                                    <div class="contact-header-content">
                                        <span>컨택</span>
                                        <button class="contact-sort-toggle" type="button">
                                            <i class="fas fa-sort"></i>
                                            <span class="sort-label">${this.contactSortTarget || '정렬'}</span>
                                        </button>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.filteredInfluencers.map((influencer, index) => {
                const influencerId = `${influencer.username}_${influencer.clean_name}`;
                const isChecked = this.selectedInfluencerIds.has(influencerId);
                const collaborationEmoji = influencer.hasCollaboration ? '🤝 ' : '';
                
                // SNS 링크에 따른 아이콘 설정
                let linkIcon = 'fas fa-external-link-alt';
                if (influencer.profile_link) {
                    if (influencer.profile_link.includes('instagram.com')) {
                        linkIcon = 'fab fa-instagram';
                    } else if (influencer.profile_link.includes('youtube.com')) {
                        linkIcon = 'fab fa-youtube';
                    } else if (influencer.profile_link.includes('tiktok.com')) {
                        linkIcon = 'fab fa-tiktok';
                    } else if (influencer.profile_link.includes('blog.naver.com')) {
                        linkIcon = 'fas fa-blog';
                    }
                }

                return `
                                    <tr class="${isChecked ? 'selected-row' : ''}">
                                        <td class="checkbox-col">
                                            <input type="checkbox" 
                                                class="influencer-checkbox" 
                                                data-influencer-id="${influencerId}"
                                                ${isChecked ? 'checked' : ''}>
                                        </td>
                                        <td class="rank-col">${influencer.filteredRank || index + 1}</td>
                                        <td class="name-username" title="${influencer.clean_name || '-'} (${influencer.username || '-'})">
                                            ${collaborationEmoji}${influencer.clean_name || '-'} (${influencer.username || '-'})
                                            <a href="${influencer.profile_link}" target="_blank" class="profile-link-icon" onclick="event.stopPropagation()">
                                                <i class="${linkIcon}"></i>
                                            </a>
                                        </td>
                                        <td class="category">${this.createCategoryBar(influencer.category).outerHTML}</td>
                                        <td class="reels-views">${influencer.reels_views_num.toLocaleString()}</td>
                                        <td class="contact-method" title="${influencer.contact_method || '-'}">${influencer.contact_method || '-'}</td>
                                    </tr>
                                `;
            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            this.leftContent.innerHTML = tableHTML;

            // 컨택 정렬 토글 버튼 이벤트
            const contactToggleBtn = this.leftContent.querySelector('.contact-sort-toggle');
            if (contactToggleBtn) {
                contactToggleBtn.addEventListener('click', () => {
                    const CONTACT_ORDER = ['other', 'inpk', 'email', 'dm', '미컨택'];
                    let idx = this.contactSortTarget ? CONTACT_ORDER.indexOf(this.contactSortTarget) : -1;
                    idx = (idx + 1) % CONTACT_ORDER.length;
                    this.contactSortTarget = CONTACT_ORDER[idx];
                    // 정렬 실행
                    if (this.contactSortTarget) {
                        this.filteredInfluencers.sort((a, b) => {
                            const aVal = (a.contact_method || '').toLowerCase();
                            const bVal = (b.contact_method || '').toLowerCase();
                            
                            // 미컨택인 경우 (빈 문자열)
                            const isAEmpty = !aVal || aVal.trim() === '';
                            const isBEmpty = !bVal || bVal.trim() === '';
                            
                            if (this.contactSortTarget === '미컨택') {
                                if (isAEmpty && !isBEmpty) return -1;
                                if (!isAEmpty && isBEmpty) return 1;
                                // 둘 다 미컨택이거나 둘 다 미컨택이 아닌 경우 알파벳 순
                                if (aVal < bVal) return -1;
                                if (aVal > bVal) return 1;
                            } else {
                                const aHas = aVal.includes(this.contactSortTarget);
                                const bHas = bVal.includes(this.contactSortTarget);
                                if (aHas && !bHas) return -1;
                                if (!aHas && bHas) return 1;
                                // 둘 다 해당 컨택이 아니면 알파벳 오름차순, 단 미컨택은 마지막
                                if (isAEmpty && !isBEmpty) return 1;
                                if (!isAEmpty && isBEmpty) return -1;
                                if (aVal < bVal) return -1;
                                if (aVal > bVal) return 1;
                            }
                            return (a.filteredRank || 0) - (b.filteredRank || 0);
                        });
                    }
                    this.renderInfluencerTable(this.filteredInfluencers);
                });
            }

            // 정렬 아이콘에 클릭 이벤트 추가
            document.querySelectorAll('.sort-toggle').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const column = button.dataset.column;
                    let newDirection;
                    if (column === 'rank') {
                        // 순위 컬럼: 항상 첫 클릭은 내림차순(▼)
                        newDirection = this.sortConfig.column === column && this.sortConfig.direction === 'desc' ? 'asc' : 'desc';
                    } else {
                        newDirection = this.sortConfig.column === column && this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
                    }
                    this.sortInfluencers(column, newDirection);
                });
            });

            // 필터 초기화
            if (this.sellerMatchFilter) {
                this.sellerMatchFilter.container = this.leftContent.querySelector('.seller-match-filters');
                this.sellerMatchFilter.init();
                this.sellerMatchFilter.setOnFilterChange(() => {
                    const filteredInfluencers = this.sellerMatchFilter.filterInfluencers(this.influencers);
                    // 순위 부여
                    filteredInfluencers.forEach((inf, i) => inf.filteredRank = i + 1);
                    this.filteredInfluencers = filteredInfluencers;
                    this.renderInfluencerTable(this.filteredInfluencers);
                });
            }
            // 체크박스 이벤트 리스너 추가
            this.addCheckboxEventListeners();

            // 중앙 패널 업데이트
            const checkedInfluencers = this.influencers.filter(influencer =>
                this.selectedInfluencerIds.has(`${influencer.username}_${influencer.clean_name}`)
            );
            this.updateCenterPanel(checkedInfluencers);

            // 엑셀 파일 입력 이벤트 리스너 추가
            const excelInput = document.getElementById('excel-import');
            if (excelInput) {
                excelInput.addEventListener('change', async (event) => {
                    const file = event.target.files[0];
                    if (file) {
                        try {
                            const result = await this.importUsersFromExcel(file.path);
                            // 파일 입력 초기화
                            event.target.value = '';
                            
                            // 결과 메시지 표시
                            alert(result.message);
                        } catch (error) {
                            console.error('엑셀 파일 처리 중 오류:', error);
                            alert('엑셀 파일을 처리하는 중 오류가 발생했습니다: ' + error.message);
                        }
                    }
                });
            }
        }
    }

    renderInfluencerTable = (influencers) => {
        const table = this.leftContent.querySelector('.influencer-table');
        if (!table) return;

        // 동적으로 헤더 생성
        const getSortIcon = (col) => {
            if (this.sortConfig.column === col) {
                return this.sortConfig.direction === 'asc' ? 
                    '<i class="fas fa-sort-up"></i>' : 
                    '<i class="fas fa-sort-down"></i>';
            }
            return '<i class="fas fa-sort"></i>';
        };
        const getContactSortLabel = () => {
            if (!this.contactSortTarget) return '(other)';
            return `(${this.contactSortTarget})`;
        };
        const theadHTML = `
        <thead>
            <tr>
                <th class="checkbox-col"><input type="checkbox" id="select-all-influencers"></th>
                <th class="rank-col">
                    <div class="sort-header-content">
                        <span>순위</span>
                        <button class="sort-toggle" data-column="rank">
                            ${getSortIcon('rank')}
                        </button>
                    </div>
                </th>
                <th class="name-username-header">
                    <div class="sort-header-content">
                        <span>이름(유저명)</span>
                        <button class="sort-toggle" data-column="name">
                            ${getSortIcon('name')}
                        </button>
                    </div>
                </th>
                <th class="category-header"><div class="sort-header-content"><span>카테고리</span></div></th>
                <th class="reels-views-header">
                    <div class="sort-header-content">
                        <span>릴스뷰</span>
                        <button class="sort-toggle" data-column="reels_views">
                            ${getSortIcon('reels_views')}
                        </button>
                    </div>
                </th>
                <th class="contact-method-header">
                    <div class="contact-header-content">
                        <span>컨택</span>
                        <button class="contact-sort-toggle" type="button">
                            <i class="fas fa-sort"></i>
                            <span class="sort-label">${this.contactSortTarget || '정렬'}</span>
                        </button>
                    </div>
                </th>
            </tr>
        </thead>
        `;
        table.innerHTML = theadHTML + table.innerHTML.replace(/<thead>[\s\S]*?<\/thead>/, '');

        const tableBody = table.querySelector('tbody');
        if (tableBody) {
            // 총 유저 수 업데이트
            const totalUsersCount = document.querySelector('.total-users-count');
            if (totalUsersCount) {
                totalUsersCount.textContent = `${influencers.length.toLocaleString()}명`;
            }

            tableBody.innerHTML = influencers.map((influencer, index) => {
                const influencerId = `${influencer.username}_${influencer.clean_name}`;
                const isChecked = this.selectedInfluencerIds.has(influencerId);
                const collaborationEmoji = influencer.hasCollaboration ? '🤝 ' : '';
                // SNS 링크에 따른 아이콘 설정
                let linkIcon = 'fas fa-external-link-alt';
                if (influencer.profile_link) {
                    if (influencer.profile_link.includes('instagram.com')) {
                        linkIcon = 'fab fa-instagram';
                    } else if (influencer.profile_link.includes('youtube.com')) {
                        linkIcon = 'fab fa-youtube';
                    } else if (influencer.profile_link.includes('tiktok.com')) {
                        linkIcon = 'fab fa-tiktok';
                    } else if (influencer.profile_link.includes('blog.naver.com')) {
                        linkIcon = 'fas fa-blog';
                    }
                }
                // 현재 결과 내 순위 (filteredRank)
                return `
                    <tr class="${isChecked ? 'selected-row' : ''}">
                        <td class="checkbox-col">
                            <input type="checkbox" 
                                class="influencer-checkbox" 
                                data-influencer-id="${influencerId}"
                                ${isChecked ? 'checked' : ''}>
                        </td>
                        <td class="rank-col">${influencer.filteredRank || index + 1}</td>
                        <td class="name-username" title="${influencer.clean_name || '-'} (${influencer.username || '-'})">
                            ${collaborationEmoji}${influencer.clean_name || '-'} (${influencer.username || '-'})
                            <a href="${influencer.profile_link}" target="_blank" class="profile-link-icon" onclick="event.stopPropagation()">
                                <i class="${linkIcon}"></i>
                            </a>
                        </td>
                        <td class="category">${this.createCategoryBar(influencer.category).outerHTML}</td>
                        <td class="reels-views">${influencer.reels_views_num.toLocaleString()}</td>
                        <td class="contact-method" title="${influencer.contact_method || '-'}">${influencer.contact_method || '-'}</td>
                    </tr>
                `;
            }).join('');

            // 체크박스 이벤트 리스너 다시 추가
            this.addCheckboxEventListeners();

            // 전체 선택 체크박스 상태 업데이트
            const allCheckboxes = document.querySelectorAll('.influencer-checkbox');
            const allChecked = allCheckboxes.length > 0 && Array.from(allCheckboxes).every(cb => cb.checked);
            document.getElementById('select-all-influencers').checked = allChecked;

            // 중앙 패널 업데이트
            const checkedInfluencers = influencers.filter(influencer =>
                this.selectedInfluencerIds.has(`${influencer.username}_${influencer.clean_name}`)
            );
            this.updateCenterPanel(checkedInfluencers);
        }

        // 정렬 아이콘에 클릭 이벤트 추가 (순위는 첫 클릭시 내림차순)
        table.querySelectorAll('.sort-toggle').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const column = button.dataset.column;
                let newDirection;
                if (column === 'rank') {
                    // 순위 컬럼: 항상 첫 클릭은 내림차순(▼)
                    newDirection = this.sortConfig.column === column && this.sortConfig.direction === 'desc' ? 'asc' : 'desc';
                } else {
                    newDirection = this.sortConfig.column === column && this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
                }
                this.sortInfluencers(column, newDirection);
            });
        });

        // 컨택 정렬 토글 버튼 이벤트 (thead 재렌더링 후에도 연결)
        const contactToggleBtn = table.querySelector('.contact-sort-toggle');
        if (contactToggleBtn) {
            contactToggleBtn.addEventListener('click', () => {
                const CONTACT_ORDER = ['other', 'inpk', 'email', 'dm', '미컨택'];
                let idx = this.contactSortTarget ? CONTACT_ORDER.indexOf(this.contactSortTarget) : -1;
                idx = (idx + 1) % CONTACT_ORDER.length;
                this.contactSortTarget = CONTACT_ORDER[idx];
                // 정렬 실행
                if (this.contactSortTarget) {
                    this.filteredInfluencers.sort((a, b) => {
                        const aVal = (a.contact_method || '').toLowerCase();
                        const bVal = (b.contact_method || '').toLowerCase();
                        
                        // 미컨택인 경우 (빈 문자열)
                        const isAEmpty = !aVal || aVal.trim() === '';
                        const isBEmpty = !bVal || bVal.trim() === '';
                        
                        if (this.contactSortTarget === '미컨택') {
                            if (isAEmpty && !isBEmpty) return -1;
                            if (!isAEmpty && isBEmpty) return 1;
                            // 둘 다 미컨택이거나 둘 다 미컨택이 아닌 경우 알파벳 순
                            if (aVal < bVal) return -1;
                            if (aVal > bVal) return 1;
                        } else {
                            const aHas = aVal.includes(this.contactSortTarget);
                            const bHas = bVal.includes(this.contactSortTarget);
                            if (aHas && !bHas) return -1;
                            if (!aHas && bHas) return 1;
                            // 둘 다 해당 컨택이 아니면 알파벳 오름차순, 단 미컨택은 마지막
                            if (isAEmpty && !isBEmpty) return 1;
                            if (!isAEmpty && isBEmpty) return -1;
                            if (aVal < bVal) return -1;
                            if (aVal > bVal) return 1;
                        }
                        return (a.filteredRank || 0) - (b.filteredRank || 0);
                    });
                }
                this.renderInfluencerTable(this.filteredInfluencers);
            });
        }
    }

    renderCenterPanel = () => {
        if (this.centerContent) {
            this.centerContent.innerHTML = '중앙 패널';
        }
    }

    renderRightPanel = () => {
        if (this.rightContent) {
            this.rightContent.innerHTML = `
                <div class="right-panel-top">
                    <h3>브랜드 히스토리</h3>
                    <div class="right-panel-content">
                        <!-- 상위 패널 내용 -->
                    </div>
                </div>
                <div class="right-panel-bottom">
                    <h3>DM히스토리 <span class="dm-count">(0)</span></h3>
                    <div class="right-panel-content">
                        <!-- 하위 패널 내용 -->
                    </div>
                </div>
            `;

            // 브랜드 히스토리 필터 초기화
            const rightPanelTop = this.rightContent.querySelector('.right-panel-top');
            if (rightPanelTop) {
                this.brandHistoryFilter.setContainer(rightPanelTop);
            }
        }
    }

    addCheckboxEventListeners = () => {
        const self = this;

        // 개별 체크박스 변경 시
        document.querySelectorAll('.influencer-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function () {
                const influencerId = this.dataset.influencerId;
                if (this.checked) {
                    self.selectedInfluencerIds.add(influencerId);
                } else {
                    self.selectedInfluencerIds.delete(influencerId);
                }

                const allChecked = Array.from(document.querySelectorAll('.influencer-checkbox')).every(cb => cb.checked);
                document.getElementById('select-all-influencers').checked = allChecked;

                // 선택된 로우 스타일 업데이트
                const row = this.closest('tr');
                if (this.checked) {
                    row.classList.add('selected-row');
                } else {
                    row.classList.remove('selected-row');
                }

                const checkedInfluencers = self.getCheckedInfluencersData(self.influencers);
                self.updateCenterPanel(checkedInfluencers);
            });
        });

        // 테이블 행 클릭 시 체크박스 토글
        document.querySelectorAll('.influencer-table tbody tr').forEach(row => {
            row.addEventListener('click', function (event) {
                // 체크박스나 링크 아이콘이 클릭된 경우는 처리하지 않음
                if (event.target.type === 'checkbox' || event.target.closest('.profile-link-icon')) return;

                // 행에 있는 체크박스 찾기
                const checkbox = this.querySelector('.influencer-checkbox');
                if (checkbox) {
                    // 체크박스 상태 토글
                    checkbox.checked = !checkbox.checked;

                    // 선택된 로우 스타일 업데이트
                    if (checkbox.checked) {
                        this.classList.add('selected-row');
                    } else {
                        this.classList.remove('selected-row');
                    }

                    // change 이벤트 발생시켜 체크박스 이벤트 핸들러 실행
                    const changeEvent = new Event('change', { bubbles: true });
                    checkbox.dispatchEvent(changeEvent);
                }
            });
        });

        // 컬럼 리사이즈 기능 추가
        this.addColumnResizeListeners();
    }

    // 컬럼 리사이즈 기능
    addColumnResizeListeners = () => {
        const tables = document.querySelectorAll('.influencer-table');
        
        tables.forEach(table => {
            const headers = table.querySelectorAll('th');
            let isResizing = false;
            let currentHeader = null;
            let startX = 0;
            let startWidth = 0;

            headers.forEach(header => {
                // 체크박스 컬럼은 리사이즈 제외
                if (header.classList.contains('checkbox-col')) return;

                header.addEventListener('mousedown', (e) => {
                    // 리사이즈 핸들 영역에서만 리사이즈 시작
                    const rect = header.getBoundingClientRect();
                    const handleWidth = 4;
                    if (e.clientX > rect.right - handleWidth) {
                        isResizing = true;
                        currentHeader = header;
                        startX = e.clientX;
                        startWidth = header.offsetWidth;

                        // 리사이즈 중일 때 커서 스타일 변경
                        document.body.style.cursor = 'col-resize';
                        document.body.style.userSelect = 'none';
                    }
                });
            });

            document.addEventListener('mousemove', (e) => {
                if (!isResizing) return;

                const diff = e.clientX - startX;
                const newWidth = Math.max(50, startWidth + diff); // 최소 너비 50px
                currentHeader.style.width = `${newWidth}px`;
            });

            document.addEventListener('mouseup', () => {
                if (isResizing) {
                    isResizing = false;
                    currentHeader = null;
                    document.body.style.cursor = '';
                    document.body.style.userSelect = '';
                }
            });
        });
    }

    updateCenterPanel = (selectedInfluencers) => {
        const centerPanel = this.centerContent;
        if (!centerPanel) return;

        if (!selectedInfluencers || selectedInfluencers.length === 0) {
            centerPanel.innerHTML = '<p class="center-panel-placeholder">좌측에서 인플루언서를 선택하면 여기에 표시됩니다.</p>';
            return;
        }

        const selectedInfluencersHTML = `
            <div class="panel-header">
                <h3>선택된 인플루언서</h3>
                <span class="count-badge">${selectedInfluencers.length}</span>
                <div class="panel-actions">
                    <button class="exclude-all-button">
                        <i class="fas fa-times-circle"></i> 전체 제외
                    </button>
                    <button class="send-dm-button">
                        <i class="fas fa-paper-plane"></i> 컨택하기
                    </button>
                </div>
            </div>
            <div class="influencer-table-container">
            <table class="influencer-table">
                <colgroup>
                        <col style="width:45px;">
                        <col style="min-width:140px;width:160px;max-width:180px;text-align:left;">
                        <col style="min-width:100px;width:130px;max-width:180px;">
                        <col style="min-width:70px;width:70px;max-width:80px;">
                        <col style="min-width:50px;width:60px;max-width:70px;">
                </colgroup>
                <thead>
                    <tr>
                        <th>제외</th>
                        <th>이름(유저명)</th>
                        <th>카테고리</th>
                        <th>릴스뷰</th>
                        <th>컨택</th>
                    </tr>
                </thead>
                <tbody>
                    ${selectedInfluencers.map((influencer, index) => {
                        if (!influencer) return '';
                        const name = influencer.clean_name || '-';
                        const username = influencer.username || '-';
                        const category = influencer.category || '-';
                        const reelsViews = influencer.reels_views_num ? influencer.reels_views_num.toLocaleString() : '-';
                        const influencerId = `${influencer.username}_${influencer.clean_name}`;
                        const collaborationEmoji = influencer.hasCollaboration ? '🤝 ' : '';
                        
                        // SNS 링크에 따른 아이콘 설정
                        let linkIcon = 'fas fa-external-link-alt';
                        if (influencer.profile_link) {
                            if (influencer.profile_link.includes('instagram.com')) {
                                linkIcon = 'fab fa-instagram';
                            } else if (influencer.profile_link.includes('youtube.com')) {
                                linkIcon = 'fab fa-youtube';
                            } else if (influencer.profile_link.includes('tiktok.com')) {
                                linkIcon = 'fab fa-tiktok';
                            } else if (influencer.profile_link.includes('blog.naver.com')) {
                                linkIcon = 'fas fa-blog';
                            }
                        }

                        return `
                            <tr data-influencer-id="${influencerId}" data-clean-name="${name}">
                                <td class="exclude-col">
                                    <button class="exclude-button" data-influencer-id="${influencerId}">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </td>
                                <td class="name-username" title="${name} (${username})">
                                    ${collaborationEmoji}${name} (${username})
                                    <a href="${influencer.profile_link || '#'}" target="_blank" class="profile-link-icon" onclick="event.stopPropagation()">
                                        <i class="${linkIcon}"></i>
                                    </a>
                                </td>
                                <td class="category">${this.createCategoryBar(category).outerHTML}</td>
                                <td class="reels-views">${reelsViews}</td>
                                <td class="contact-method" title="${influencer.contact_method || '-'}">${influencer.contact_method || '-'}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            </div>
        `;
        centerPanel.innerHTML = selectedInfluencersHTML;

        // 제외 버튼 클릭 이벤트 추가
        document.addEventListener('click', (e) => {
            const excludeBtn = e.target.closest('.exclude-button');
            if (excludeBtn) {
                const influencerId = excludeBtn.dataset.influencerId;
                if (influencerId) {
                    this.excludeInfluencer(influencerId);
                }
            }
        });

        // 전체 제외 버튼 클릭 이벤트 추가
        centerPanel.querySelector('.exclude-all-button').addEventListener('click', this.excludeAllInfluencers);

        // 컨택하기 버튼 클릭 이벤트 추가
        centerPanel.querySelector('.send-dm-button').addEventListener('click', this.sendDm);

        // 중앙 패널의 행 클릭 이벤트 추가
        centerPanel.querySelectorAll('tr[data-clean-name]').forEach(row => {
            row.addEventListener('click', async (event) => {
                // 링크 아이콘이나 제외 버튼 클릭 시에는 이벤트 처리하지 않음
                if (event.target.closest('.profile-link-icon') || event.target.closest('.exclude-button')) return;

                const cleanName = row.dataset.cleanName;
                const influencerId = row.dataset.influencerId;
                // username 파싱 로직 수정 - 마지막 언더스코어와 clean_name을 제외한 부분만 사용
                const parts = influencerId.split('_');
                const username = parts.slice(0, -1).join('_');

                const records = await this.dmRecordsManager.getDmRecords(cleanName);
                const rightPanelBottom = document.querySelector('.right-panel-bottom .right-panel-content');
                const dmCount = document.querySelector('.dm-count');
                const rightPanelTop = document.querySelector('.right-panel-top');

                if (rightPanelBottom) {
                    rightPanelBottom.innerHTML = `
                        ${this.dmRecordsManager.renderDmRecords(records)}
                    `;
                    if (dmCount) {
                        dmCount.textContent = `(${records.length})`;
                    }
                }

                if (rightPanelTop) {
                    const brandRecords = await this.brandRecordsManager.getBrandRecords(username);
                    // 기존 필터 제거
                    const existingFilter = rightPanelTop.querySelector('.brand-history-filter');
                    if (existingFilter) {
                        existingFilter.remove();
                    }
                    
                    // 기존 콘텐츠 제거
                    const existingContent = rightPanelTop.querySelector('.right-panel-content');
                    if (existingContent) {
                        existingContent.remove();
                    }

                    // 새로운 콘텐츠 추가
                    rightPanelTop.innerHTML = `
                        <h3>브랜드 히스토리</h3>
                        <div class="right-panel-content">
                            ${this.brandRecordsManager.renderBrandRecords(brandRecords)}
                        </div>
                    `;
                    
                    // 브랜드 히스토리 필터 재초기화
                    this.brandHistoryFilter.setContainer(rightPanelTop);
                }
            });
        });
    }

    // 인플루언서 제외 함수 추가
    excludeInfluencer = (influencerId) => {
        console.log('excludeInfluencer 호출');
        // 선택된 인플루언서 목록에서 제거
        this.selectedInfluencerIds.delete(influencerId);

        // 좌측 패널의 체크박스 상태 업데이트
        const checkbox = document.querySelector(`.influencer-checkbox[data-influencer-id="${influencerId}"]`);
        if (checkbox) {
            checkbox.checked = false;
            checkbox.closest('tr').classList.remove('selected-row');
        }

        // 중앙 패널에서 해당 행만 제거
        const centerPanel = this.centerContent;
        if (centerPanel) {
            const rowToRemove = centerPanel.querySelector(`tr[data-influencer-id="${influencerId}"]`);
            if (rowToRemove) {
                rowToRemove.remove();
                
                // 선택된 인플루언서 수 업데이트
                const countBadge = centerPanel.querySelector('.count-badge');
                if (countBadge) {
                    const currentCount = parseInt(countBadge.textContent);
                    countBadge.textContent = currentCount - 1;
                }

                // 선택된 인플루언서가 없으면 placeholder 표시
                const tbody = centerPanel.querySelector('tbody');
                if (tbody && tbody.children.length === 0) {
                    centerPanel.innerHTML = '<p class="center-panel-placeholder">좌측에서 인플루언서를 선택하면 여기에 표시됩니다.</p>';
                }
            }
        }
    }

    // 전체 제외 함수 추가
    excludeAllInfluencers = () => {
        console.log('excludeAllInfluencers 호출');
        // 모든 선택된 인플루언서 제거
        this.selectedInfluencerIds.clear();

        // 좌측 패널의 모든 체크박스 해제
        document.querySelectorAll('.influencer-checkbox').forEach(checkbox => {
            checkbox.checked = false;
            checkbox.closest('tr').classList.remove('selected-row');
        });

        // 중앙 패널 업데이트
        this.updateCenterPanel([]);
    }

    sendDm = () => {
        this.dmModal.open();
    }

    // 전체 선택/해제 토글 함수
    toggleAllInfluencers = (checkbox) => {
        console.log('toggleAllInfluencers 호출');
        const isChecked = checkbox.checked;
        const visibleInfluencers = Array.from(document.querySelectorAll('.influencer-checkbox'));

        visibleInfluencers.forEach(cb => {
            cb.checked = isChecked;
            const influencerId = cb.dataset.influencerId;
            if (isChecked) {
                cb.closest('tr').classList.add('selected-row');
                window.sellerMatchManager.selectedInfluencerIds.add(influencerId);
            } else {
                cb.closest('tr').classList.remove('selected-row');
                window.sellerMatchManager.selectedInfluencerIds.delete(influencerId);
            }
        });

        // SellerMatchManager 인스턴스 가져오기
        const sellerMatchManager = window.sellerMatchManager;
        if (!sellerMatchManager) return;

        // 체크된 인플루언서 확인
        const checkedInfluencers = sellerMatchManager.influencers.filter(influencer =>
            sellerMatchManager.selectedInfluencerIds.has(`${influencer.username}_${influencer.clean_name}`)
        );

        // 중앙 패널 업데이트
        sellerMatchManager.updateCenterPanel(checkedInfluencers);

    }

    // 체크된 인플루언서 데이터 반환 함수
    getCheckedInfluencersData = (allInfluencers) => {
        console.log('getCheckedInfluencersData 호출');
        if (!allInfluencers || !allInfluencers.length) return [];

        // SellerMatchManager 인스턴스에서 선택된 ID 목록 가져오기
        //const sellerMatchManager = window.sellerMatchManager;
        //if (!sellerMatchManager) return [];

        // 선택된 ID에 해당하는 인플루언서 데이터 반환
        return allInfluencers.filter(influencer =>
            this.selectedInfluencerIds.has(`${influencer.username}_${influencer.clean_name}`)
        );
    }

    createCategoryBar = (categoryData) => {
        //console.log('createCategoryBar 호출');
        const categories = categoryData.split(',');
        const container = document.createElement('div');
        container.className = 'category-bar-container';

        // 카테고리 정보를 먼저 추가
        const info = document.createElement('div');
        info.className = 'category-info';

        // 전체 비율 계산
        let totalPercentage = 0;
        categories.forEach(cat => {
            const [_, percent] = cat.split('(');
            const percentage = parseInt(percent);
            totalPercentage += percentage;
        });

        categories.forEach(cat => {
            const [category, percent] = cat.split('(');
            const percentage = parseInt(percent);
            const normalizedPercentage = (percentage / totalPercentage) * 100;

            const label = document.createElement('div');
            label.className = 'category-label';

            const color = document.createElement('div');
            color.className = 'category-color';
            color.style.backgroundColor = this.getCategoryColor(category);

            const text = document.createElement('span');
            text.textContent = `${category}(${percentage}%)`;

            label.appendChild(color);
            label.appendChild(text);
            info.appendChild(label);
        });

        container.appendChild(info);

        // 바 추가
        const bar = document.createElement('div');
        bar.className = 'category-bar';

        categories.forEach(cat => {
            const [category, percent] = cat.split('(');
            const percentage = parseInt(percent);
            const normalizedPercentage = (percentage / totalPercentage) * 100;

            const segment = document.createElement('div');
            segment.className = 'category-segment';
            segment.setAttribute('data-category', category);
            segment.style.width = `${normalizedPercentage}%`;
            segment.textContent = `${category}(${percentage}%)`;
            bar.appendChild(segment);
        });

        container.appendChild(bar);
        return container;
    }

    getCategoryColor = (category) => {
        //console.log('getCategoryColor 호출');
        const colors = {
            '뷰티': '#FFD1DC',
            '패션': '#FFC1B6',
            '홈/리빙': '#D1F0F0',
            '푸드': '#FFE4C4',
            '육아': '#E6D1FF',
            '건강': '#a8e6c9',
            '맛집탐방': '#FFE8C1',
            '전시/공연': '#FFD1DC',
            '반려동물': '#E6D1B8',
            '기타': '#E0E0E0'
        };
        return colors[category] || '#E0E0E0';
    }

    // 엑셀 파일에서 사용자 목록을 가져와 선택된 인플루언서에 추가
    importUsersFromExcel = async (filePath) => {
        try {
            // 엑셀 파일 읽기
            const data = await window.api.readExcelFile(filePath);
            
            if (!Array.isArray(data) || data.length <= 1) { // 헤더 행이 있어야 하므로 최소 2행 필요
                throw new Error('엑셀 파일에서 데이터를 읽을 수 없습니다.');
            }

            // 첫 번째 행은 헤더이므로 제외하고 B 컬럼(인플루언서)과 M 컬럼(최근협업이력) 데이터 추출
            const usernames = data.slice(1).map(row => {
                if (!Array.isArray(row) || row.length < 13) {
                    return { username: '', hasCollaboration: false };
                }
                const username = row[1] || ''; // B 컬럼
                const collaborationHistory = row[12] || ''; // M 컬럼 (최근협업이력)
                return {
                    username: username.trim(),
                    hasCollaboration: collaborationHistory.trim() !== ''
                };
            }).filter(item => item.username !== '');
            
            if (usernames.length === 0) {
                throw new Error('엑셀 파일에서 인플루언서 정보를 찾을 수 없습니다.');
            }

            // 각 사용자에 대해 매칭되는 인플루언서 찾기
            let matchedCount = 0;
            usernames.forEach(({ username, hasCollaboration }) => {
                const matchingInfluencer = this.influencers.find(influencer => 
                    influencer.username === username || influencer.clean_name === username
                );
                
                if (matchingInfluencer) {
                    matchedCount++;
                    const influencerId = `${matchingInfluencer.username}_${matchingInfluencer.clean_name}`;
                    this.selectedInfluencerIds.add(influencerId);
                    
                    // 협업 이력이 있는 경우 이모티콘 추가
                    if (hasCollaboration) {
                        matchingInfluencer.hasCollaboration = true;
                    }
                }
            });

            // 좌측 패널의 체크박스 상태 업데이트
            document.querySelectorAll('.influencer-checkbox').forEach(checkbox => {
                const influencerId = checkbox.dataset.influencerId;
                if (this.selectedInfluencerIds.has(influencerId)) {
                    checkbox.checked = true;
                    checkbox.closest('tr').classList.add('selected-row');
                }
            });

            // 중앙 패널 업데이트
            const checkedInfluencers = this.influencers.filter(influencer =>
                this.selectedInfluencerIds.has(`${influencer.username}_${influencer.clean_name}`)
            );
            this.updateCenterPanel(checkedInfluencers);

            return {
                success: true,
                message: `엑셀파일내 ${usernames.length}명의 사용자 중 ${matchedCount}명이 매칭되었습니다.`
            };
        } catch (error) {
            console.error('엑셀 파일 읽기 중 오류 발생:', error);
            return {
                success: false,
                message: error.message || '엑셀 파일을 읽는 중 오류가 발생했습니다.'
            };
        }
    }

    // 정렬 함수 추가
    sortInfluencers = (column, direction) => {
        this.sortConfig.column = column;
        this.sortConfig.direction = direction;

        const CATEGORY_ORDER = [
            '뷰티', '패션', '홈/리빙', '푸드', '육아', '건강', '맛집탐방', '전시/공연', '반려동물', '기타'
        ];

        if (column === 'rank') {
            if (direction === 'asc') {
                this.filteredInfluencers = [...this.filteredInfluencers].sort((a, b) => this.originalInfluencers.indexOf(a) - this.originalInfluencers.indexOf(b));
            } else {
                this.filteredInfluencers = [...this.filteredInfluencers].sort((a, b) => this.originalInfluencers.indexOf(b) - this.originalInfluencers.indexOf(a));
            }
        } else if (column === 'category') {
            // 카테고리별 인원수 집계 (필터된 결과 내에서)
            const categoryCounts = {};
            this.filteredInfluencers.forEach(inf => {
                const mainCat = (inf.category || '').split(',')[0].replace(/\(.*\)/, '').trim();
                if (!categoryCounts[mainCat]) categoryCounts[mainCat] = 0;
                categoryCounts[mainCat]++;
            });
            this.filteredInfluencers.sort((a, b) => {
                const catA = (a.category || '').split(',')[0].replace(/\(.*\)/, '').trim();
                const catB = (b.category || '').split(',')[0].replace(/\(.*\)/, '').trim();
                const countA = categoryCounts[catA] || 0;
                const countB = categoryCounts[catB] || 0;
                if (direction === 'asc') {
                    return countB - countA; // 많은 순
                } else {
                    return countA - countB; // 적은 순
                }
            });
        } else if (column === 'categoryPercent') {
            // 카테고리별 비중 정렬 (필터된 결과 내에서)
            if (this.categorySortTarget) {
                this.filteredInfluencers.sort((a, b) => {
                    const getPercent = (catStr) => {
                        if (!catStr) return 0;
                        const cats = catStr.split(',').map(s => s.trim());
                        for (const c of cats) {
                            const match = c.match(/(.+?)\((\d+)%\)/);
                            if (match && match[1].trim() === this.categorySortTarget) {
                                return parseInt(match[2], 10);
                            }
                        }
                        return 0;
                    };
                    const percentA = getPercent(a.category);
                    const percentB = getPercent(b.category);
                    return percentB - percentA;
                });
            }
        } else {
            this.filteredInfluencers.sort((a, b) => {
                let valueA, valueB;

                switch (column) {
                    case 'name':
                        valueA = (a.clean_name || '').toLowerCase();
                        valueB = (b.clean_name || '').toLowerCase();
                        break;
                    case 'reels_views':
                        valueA = a.reels_views_num || 0;
                        valueB = b.reels_views_num || 0;
                        break;
                    case 'contact':
                        valueA = (a.contact_method || '').toLowerCase();
                        valueB = (b.contact_method || '').toLowerCase();
                        // '-'(하이픈)은 항상 마지막, 나머지는 알파벳 오름차순
                        const isAHyphen = valueA === '-' || valueA.trim() === '';
                        const isBHyphen = valueB === '-' || valueB.trim() === '';
                        if (isAHyphen && !isBHyphen) return 1;
                        if (!isAHyphen && isBHyphen) return -1;
                        break;
                    default:
                        return 0;
                }

                if (direction === 'asc') {
                    return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
                } else {
                    return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
                }
            });
        }

        // 테이블만 다시 렌더링
        this.renderInfluencerTable(this.filteredInfluencers);
    }

}// class SellerMatchManager


// DOM이 완전히 로드된 후 초기화
/*
document.addEventListener('DOMContentLoaded', () => {
window.sellerMatchManager = new SellerMatchManager();
});
*/
