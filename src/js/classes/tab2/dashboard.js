// window.mongo 사용
export class Dashboard {
    constructor() {
        this.data = {
            brandStatus: {
                new: 0,
                contactPlanned: 0,
                proposalPlanned: 0,
                negotiationWaiting: 0,
                matchingSeller: 0,
                campaignInProgress: 0
            },
            campaigns: {
                scheduled: [],
                inProgress: [],
                completed: []
            },
            brandsByStage: {
                contact: [],
                proposal: [],
                negotiation: [],
                matching: []
            },
            performanceStats: {
                topInfluencers: [],
                lastMonthRevenue: 0,
                monthlyGoal: 0,
                completedCampaigns: 0,
                averageConversion: 0
            }
        };
        this.activeBrandTab = 'contact';
        this.campaignsToShow = 4;
        this._eventRegistered = false;
        this._isFallbackData = false;
    }

    async init() {
        console.log("API 객체:", window.api);
        console.log("API 함수 목록:", Object.keys(window.api));

        try {
            await this.loadAllData();
            this.renderDashboard();
        } catch (error) {
            console.error("대시보드 초기화 중 오류:", error);
            this.loadFallbackData();
            this.renderDashboard();
        }

        this.campaignsToShow = 4;
        if (!this._eventRegistered) {
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('brand-tab')) {
                    this.activeBrandTab = e.target.getAttribute('data-tab');
                    this.renderDashboard();
                }
                if (e.target.classList.contains('more-button')) {
                    const allCampaigns = [
                        ...this.data.campaigns.inProgress,
                        ...this.data.campaigns.scheduled
                    ];
                    this.campaignsToShow = Math.min(this.campaignsToShow + 4, allCampaigns.length);
                    this.renderDashboard();
                }
            });
            this._eventRegistered = true;
        }
    }

    // 모든 데이터 로드
    async loadAllData() {
        try {
            console.log("데이터 로드 시작...");
            
            // 브랜드 상태 데이터 로드
            const brandStatus = await window.api.fetchBrandStatus();
            this.data.brandStatus = brandStatus;

            // 캠페인 데이터 로드
            const campaigns = await window.api.fetchCampaigns();
            this.data.campaigns = campaigns;

            // 브랜드 단계별 데이터 로드
            const brandsByStage = await window.api.fetchBrandsByStage();
            this.data.brandsByStage = brandsByStage;

            // 성과 통계 데이터 로드
            const performanceStats = await window.api.fetchPerformanceStats();
            this.data.performanceStats = performanceStats;

            console.log("모든 데이터 로드 완료");
        } catch (error) {
            console.error('데이터 로드 중 오류:', error);
            throw error;
        }
    }

    // 대체 데이터 로드
    loadFallbackData() {
        console.log("대체 데이터 사용");
        this._isFallbackData = true;
        this.data = {
            brandStatus: {
                new: 3,
                contactPlanned: 2,
                proposalPlanned: 2,
                negotiationWaiting: 1,
                matchingSeller: 1,
                campaignInProgress: 2
            },
            campaigns: {
                scheduled: [
                    {
                        id: 1,
                        brandName: "뷰티브랜드A",
                        startDate: "2024-05-04",
                        endDate: "2024-05-06",
                        influencer: "인플루언서1",
                        status: "confirmed"
                    },
                    {
                        id: 2,
                        brandName: "패션브랜드B",
                        startDate: "2024-05-08",
                        endDate: "2024-05-12",
                        influencer: "인플루언서2",
                        status: "pending"
                    },
                    {
                        id: 3,
                        brandName: "가전브랜드C",
                        startDate: "2024-05-15",
                        endDate: "2024-05-20",
                        influencer: "인플루언서3",
                        status: "confirmed"
                    }
                ],
                inProgress: [
                    {
                        id: 4,
                        brandName: "화장품브랜드D",
                        startDate: "2024-05-01",
                        endDate: "2024-05-07",
                        influencer: "인플루언서4",
                        views: 12500
                    },
                    {
                        id: 5,
                        brandName: "식품브랜드E",
                        startDate: "2024-05-03",
                        endDate: "2024-05-09",
                        influencer: "인플루언서5",
                        views: 8300
                    }
                ],
                completed: []
            },
            brandsByStage: {
                contact: [
                    { name: "신규브랜드A", category: "뷰티", manager: "김담당", statusLabel: "컨택 필요" },
                    { name: "신규브랜드B", category: "패션", manager: "이담당", statusLabel: "컨택 필요" },
                    { name: "신규브랜드C", category: "가전", manager: "박담당", statusLabel: "컨택 필요" }
                ],
                proposal: [
                    { name: "신규브랜드A", category: "뷰티", manager: "김담당", statusLabel: "제안서 필요" },
                    { name: "신규브랜드B", category: "패션", manager: "이담당", statusLabel: "제안서 필요" }
                ],
                negotiation: [
                    { name: "신규브랜드A", category: "뷰티", manager: "김담당", statusLabel: "협의 중" },
                    { name: "신규브랜드B", category: "패션", manager: "이담당", statusLabel: "협의 중" }
                ],
                matching: [
                    { name: "신규브랜드A", category: "뷰티", manager: "김담당", statusLabel: "셀러 매칭 중" }
                ]
            },
            performanceStats: {
                topInfluencers: ["인플루언서1", "인플루언서2"],
                lastMonthRevenue: 12000000,
                monthlyGoal: 20000000,
                completedCampaigns: 5,
                averageConversion: 3.2
            }
        };
    }

    // 날짜를 표시 형식으로 변환하는 함수
    displayDate(dateStr) {
        const date = new Date(dateStr);
        return `${date.getMonth() + 1}/${date.getDate()}`;
    }

    // 대시보드 렌더링
    renderDashboard() {
        const dashboardContainer = document.querySelector('.dashboard-container');
        if (!dashboardContainer) {
            console.error("대시보드 컨테이너를 찾을 수 없습니다.");
            return;
        }
        console.log("대시보드 렌더링 시작");

        // 공구 스케줄 리스트 합치고 정렬
        const allCampaigns = [
            ...this.data.campaigns.inProgress.map(c => ({...c, _type: 'inProgress'})),
            ...this.data.campaigns.scheduled.map(c => ({...c, _type: 'scheduled'}))
        ].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        this.campaignsToShow = Math.min(this.campaignsToShow, allCampaigns.length);
        const visibleCampaigns = allCampaigns.slice(0, this.campaignsToShow);
        const hasMore = allCampaigns.length > this.campaignsToShow;

        // 대체 데이터 사용 여부 체크
        const isFallback = this._isFallbackData;

        dashboardContainer.innerHTML = `
            <div class="dashboard-container">
                <h1 class="dashboard-title">공동구매 벤더사 대시보드${isFallback ? ' <span style=\"font-size:1rem;color:#d97706;\">(대체 데이터 사용)</span>' : ''}</h1>
                
                <!-- 브랜드사 현황 카드 -->
                <div class="brand-status-grid">
                    <div class="status-card status-blue">
                        <div class="count">${this.data.brandStatus.new}</div>
                        <div class="label">New</div>
                    </div>
                    <div class="status-card status-purple">
                        <div class="count">${this.data.brandStatus.contactPlanned}</div>
                        <div class="label">후보컨택 예정</div>
                    </div>
                    <div class="status-card status-indigo">
                        <div class="count">${this.data.brandStatus.proposalPlanned}</div>
                        <div class="label">제안서 발송 예정</div>
                    </div>
                    <div class="status-card status-yellow">
                        <div class="count">${this.data.brandStatus.negotiationWaiting}</div>
                        <div class="label">협의 대기</div>
                    </div>
                    <div class="status-card status-green">
                        <div class="count">${this.data.brandStatus.matchingSeller}</div>
                        <div class="label">셀러 매칭 중</div>
                    </div>
                    <div class="status-card status-orange">
                        <div class="count">${this.data.brandStatus.campaignInProgress}</div>
                        <div class="label">공구 진행중</div>
                    </div>
                </div>

                <!-- 브랜드사 세부 현황 -->
                <div class="main-content-grid">
                    <div class="brand-status-table">
                        <h2 class="table-header">브랜드사 세부 현황</h2>
                        <div class="brand-tabs">
                            <button class="brand-tab${this.activeBrandTab === 'contact' ? ' active' : ''}" data-tab="contact">컨택 필요 (${this.data.brandsByStage.contact.length})</button>
                            <button class="brand-tab${this.activeBrandTab === 'proposal' ? ' active' : ''}" data-tab="proposal">제안서 필요 (${this.data.brandsByStage.proposal.length})</button>
                            <button class="brand-tab${this.activeBrandTab === 'negotiation' ? ' active' : ''}" data-tab="negotiation">협의 중 (${this.data.brandsByStage.negotiation.length})</button>
                            <button class="brand-tab${this.activeBrandTab === 'matching' ? ' active' : ''}" data-tab="matching">셀러 매칭 중 (${this.data.brandsByStage.matching.length})</button>
                        </div>
                        <div class="table-container">
                            <table class="brand-table">
                                <thead>
                                    <tr>
                                        <th>브랜드명</th>
                                        <th>카테고리</th>
                                        <th>담당자</th>
                                        <th>상태</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${(this.data.brandsByStage[this.activeBrandTab] || []).map(brand => `
                                        <tr>
                                            <td>${brand.name}</td>
                                            <td>${brand.category}</td>
                                            <td>${brand.manager}</td>
                                            <td><span class="status-badge">${brand.statusLabel}</span></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- 공구 스케줄 -->
                    <div class="campaign-schedule">
                        <div class="schedule-header">
                            <h2 class="schedule-title">공구 스케줄</h2>
                            <button class="week-button">이번 주</button>
                        </div>
                        <div class="campaign-list">
                            ${visibleCampaigns.map(campaign => `
                                <div class="campaign-card ${campaign._type === 'inProgress' ? 'in-progress' : 'scheduled'}">
                                    <div class="campaign-name">${campaign.brandName}</div>
                                    <div class="campaign-date">${this.displayDate(campaign.startDate)} - ${this.displayDate(campaign.endDate)}</div>
                                    <div class="campaign-influencer">${campaign.influencer}</div>
                                    <div class="campaign-footer">
                                        ${campaign._type === 'inProgress'
                                            ? `<span class=\"status-badge yellow\">진행중</span><div class=\"views\">조회수: ${campaign.views?.toLocaleString() ?? 0}</div>`
                                            : `<span class=\"status-badge blue\">${campaign.status === 'confirmed' ? '확정' : '대기중'}</span>`}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        ${hasMore ? '<button class="more-button">더 보기</button>' : ''}
                    </div>
                </div>
                
                <!-- 성과 요약 -->
                <div class="performance-grid">
                    <div class="performance-card">
                        <h3 class="performance-label">완료된 공구</h3>
                        <div class="performance-value">${this.data.performanceStats.completedCampaigns}</div>
                    </div>
                    <div class="performance-card">
                        <h3 class="performance-label">지난 달 매출</h3>
                        <div class="performance-value">${this.data.performanceStats.lastMonthRevenue.toLocaleString()}원</div>
                    </div>
                    <div class="performance-card">
                        <h3 class="performance-label">평균 전환율</h3>
                        <div class="performance-value">${this.data.performanceStats.averageConversion}%</div>
                    </div>
                    <div class="performance-card">
                        <h3 class="performance-label">월간 목표 달성률</h3>
                        <div class="performance-value">
                            ${Math.round((this.data.performanceStats.lastMonthRevenue / this.data.performanceStats.monthlyGoal) * 100)}%
                        </div>
                        <div class="progress-bar">
                            <div 
                                class="progress-fill" 
                                style="width: ${(this.data.performanceStats.lastMonthRevenue / this.data.performanceStats.monthlyGoal) * 100}%"
                            ></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// 대시보드 인스턴스 생성
//window.dashboard = new Dashboard(); 