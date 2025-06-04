/**
 * brand-match.js
 * @fileoverview 브랜드 매칭 탭 초기화
 */

// 전역 변수 선언
let groupedByBrand = {};
let editedItems = {}; // 수정된 상품명을 저장할 객체
let duplicatedBrands = new Set(); // 복제된 브랜드 목록을 저장할 Set

export function initPage() {
    console.log('브랜드 매칭 페이지가 초기화되었습니다.');
    
    // 패널 초기화
    const leftContent = document.getElementById('brand-match-left-content');
    const centerContent = document.getElementById('brand-match-center-content');
    const rightContent = document.getElementById('brand-match-right-content');

    // 각 패널 내용 비우기
    if (leftContent) {
        leftContent.innerHTML = `
            <div class="panel-header">
                <h3>인플루언서 조회</h3>
            </div>
            <div class="search-container" style="padding: 1rem 1rem 0 1rem;">
                <div class="input-group" style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <input 
                        type="text" 
                        id="username-input" 
                        class="form-input" 
                        placeholder="인플루언서 사용자명 또는 정제명 입력"
                        style="flex: 1; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;"
                    >
                    <input 
                        type="number" 
                        id="days-input" 
                        class="form-input" 
                        placeholder="일자"
                        min="1"
                        max="365"
                        value="14"
                        style="width: 80px; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; text-align: center;"
                    >
                    <span style="display: flex; align-items: center; color: #666; font-size: 0.875rem;">일 이내</span>
                    <button id="search-influencer-btn" class="btn btn-primary">조회</button>
                    <button id="reset-influencer-btn" 
                            class="btn" 
                            style="padding: 0.5rem 1rem; 
                                   background-color: #f8f9fa; 
                                   color: #333; 
                                   border: 1px solid #ddd; 
                                   border-radius: 4px; 
                                   cursor: pointer;
                                   display: flex;
                                   align-items: center;
                                   gap: 4px;
                                   transition: all 0.2s;"
                            onmouseover="this.style.backgroundColor='#e9ecef'"
                            onmouseout="this.style.backgroundColor='#f8f9fa'">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                            <path d="M3 3v5h5"></path>
                        </svg>
                        초기화
                    </button>
                </div>
            </div>
            <div class="list-containers" style="display: flex; flex-direction: column; gap: 1rem; padding: 0 1rem;">
                <div id="influencer-list" class="list-container" style="background-color: #fff; border: 1px solid #e5e7eb; border-radius: 0.5rem; overflow: hidden;">
                    <div class="list-header" style="padding: 0.75rem; background-color: #f3f4f6; border-bottom: 1px solid #e5e7eb; font-weight: 500;">
                        <span>인플루언서 정보</span>
                    </div>
                </div>
                <div id="brand-list" class="list-container" style="background-color: #fff; border: 1px solid #e5e7eb; border-radius: 0.5rem; overflow: hidden;">
                    <div class="list-header" style="padding: 0.75rem; background-color: #f3f4f6; border-bottom: 1px solid #e5e7eb; font-weight: 500;">
                        <span>브랜드 정보</span>
                    </div>
                </div>
            </div>
        `;

        // 조회 버튼 이벤트 리스너 추가
        const searchBtn = leftContent.querySelector('#search-influencer-btn');
        const resetBtn = leftContent.querySelector('#reset-influencer-btn');
        const usernameInput = leftContent.querySelector('#username-input');
        const daysInput = leftContent.querySelector('#days-input');

        // 초기화 버튼 이벤트 리스너
        resetBtn.addEventListener('click', () => {
            // 입력 필드 초기화
            usernameInput.value = '';
            daysInput.value = '14'; // 기본값으로 14일 설정
            
            // 인플루언서 리스트 컨테이너 초기화 (헤더 제외)
            const listContainer = leftContent.querySelector('#influencer-list');
            const existingItems = listContainer.querySelectorAll('.list-item:not(.list-header)');
            existingItems.forEach(item => item.remove());

            // 브랜드 리스트 컨테이너 초기화 (헤더 제외)
            const brandListContainer = leftContent.querySelector('#brand-list');
            const existingBrandItems = brandListContainer.querySelectorAll('.list-item:not(.list-header)');
            existingBrandItems.forEach(item => item.remove());

            // 초기화 토스트 메시지
            const toast = document.createElement('div');
            toast.className = 'toast-message success';
            toast.innerHTML = `
                <span class="toast-icon">✓</span>
                <span class="toast-text">초기화되었습니다.</span>
            `;
            document.body.appendChild(toast);
            setTimeout(() => {
                toast.classList.add('fade-out');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        });

        searchBtn.addEventListener('click', async () => {
            const username = usernameInput.value.trim();
            const days = parseInt(daysInput.value) || 14; // 기본값 14일
            
            if (!username) {
                // 입력값이 없는 경우 토스트 메시지
                const toast = document.createElement('div');
                toast.className = 'toast-message warning';
                toast.innerHTML = `
                    <span class="toast-icon">⚠</span>
                    <span class="toast-text">사용자명을 입력해주세요.</span>
                `;
                document.body.appendChild(toast);
                setTimeout(() => {
                    toast.classList.add('fade-out');
                    setTimeout(() => toast.remove(), 300);
                }, 3000);
                return;
            }

            try {
                // 로딩 토스트 메시지 표시
                const toast = document.createElement('div');
                toast.className = 'toast-message loading';
                toast.innerHTML = `
                    <span class="toast-icon">⌛</span>
                    <span class="toast-text">데이터를 불러오는 중...</span>
                `;
                document.body.appendChild(toast);

                // MongoDB에서 인플루언서 데이터 조회
                const data = await window.api.fetchInfluencerDataForSellerMatch();
                const matchedData = data.find(item => {
                    return item.username === username || item.clean_name === username;
                });

                const listContainer = leftContent.querySelector('#influencer-list');
                
                // 기존 리스트 아이템 제거 (헤더 제외)
                const existingItems = listContainer.querySelectorAll('.list-item:not(.list-header)');
                existingItems.forEach(item => item.remove());

                // 데이터 표시
                if (matchedData) {
                    console.group('🔍 매칭 브랜드 디버깅');
                    
                    // 제외할 브랜드 목록
                    const excludedBrands = ['확인필요', 'n', 'N', 'N/A', '복합상품'];
                    
                    // 검색된 인플루언서의 브랜드 정보에서 기간 내 필터링된 브랜드만 추출
                    const filteredBrands = matchedData.brand ? matchedData.brand.filter(brand => {
                        // 제외 브랜드 목록에 있는 경우 제외
                        if (excludedBrands.includes(brand.name)) {
                            return false;
                        }
                        
                        // 인플루언서의 username이나 clean_name이 브랜드명에 포함된 경우 제외
                        if (brand.name && (
                            brand.name.includes(matchedData.username) || 
                            brand.name.includes(matchedData.clean_name)
                        )) {
                            return false;
                        }

                        // 사용자가 입력한 일수 이내의 상품이 있는지 확인
                        if (brand.products && Array.isArray(brand.products)) {
                            const now = new Date();
                            const daysAgo = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
                            
                            // 입력한 일수 이내의 상품이 하나라도 있는지 확인
                            return brand.products.some(product => {
                                if (product.mentioned_date) {
                                    const mentionedDate = new Date(product.mentioned_date);
                                    return mentionedDate >= daysAgo;
                                }
                                return false;
                            });
                        }
                        return false;
                    }) : [];

                    console.log('기간 내 필터링된 브랜드:', filteredBrands);

                    // 필터링된 브랜드 이름 목록
                    const filteredBrandNames = filteredBrands.map(b => b.name);

                    // 해당 브랜드들을 진행한 다른 인플루언서들 찾기
                    const relatedInfluencers = data.filter(item => {
                        // 자기 자신 제외
                        if (item.username === matchedData.username || item.clean_name === matchedData.clean_name) return false;
                        
                        // 브랜드 정보가 있는 경우에만 처리
                        if (item.brand && Array.isArray(item.brand)) {
                            // 필터링된 브랜드 중 하나라도 진행한 인플루언서 찾기
                            return item.brand.some(b => 
                                filteredBrandNames.includes(b.name) && 
                                !excludedBrands.includes(b.name) &&
                                !(b.name && (
                                    b.name.includes(item.username) || 
                                    b.name.includes(item.clean_name)
                                ))
                            );
                        }
                        return false;
                    });

                    console.log('관련 인플루언서 목록:', relatedInfluencers.map(i => ({
                        username: i.username,
                        clean_name: i.clean_name,
                        brands: i.brand.map(b => b.name)
                    })));

                    // 좌측 패널 인플루언서 정보 업데이트
                    const influencerListContainer = leftContent.querySelector('#influencer-list');
                    const influencerDetailItem = document.createElement('div');
                    influencerDetailItem.className = 'list-item influencer-detail';
                    influencerDetailItem.innerHTML = `
                        <div class="detail-section" style="display: flex; flex-direction: column; gap: 1rem; padding: 1rem;">
                            <!-- 상단: 통계 정보 -->
                            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; margin-bottom: 0.5rem;">
                                <div style="text-align: center; padding: 0.5rem; background-color: #f3f4f6; border-radius: 0.5rem;">
                                    <div style="display: flex; align-items: center; justify-content: center; gap: 0.25rem; white-space: nowrap;">
                                        <span style="font-size: 0.75rem; color: #6b7280;">게시물</span>
                                        <span style="font-weight: 600; color: #111827; font-size: 0.875rem;">${matchedData.posts ? Number(matchedData.posts).toLocaleString() : '-'}</span>
                                    </div>
                                </div>
                                <div style="text-align: center; padding: 0.5rem; background-color: #f3f4f6; border-radius: 0.5rem;">
                                    <div style="display: flex; align-items: center; justify-content: center; gap: 0.25rem; white-space: nowrap;">
                                        <span style="font-size: 0.75rem; color: #6b7280;">팔로워</span>
                                        <span style="font-weight: 600; color: #111827; font-size: 0.875rem;">${matchedData.followers ? Number(matchedData.followers).toLocaleString() : '-'}</span>
                                    </div>
                                </div>
                                <div style="text-align: center; padding: 0.5rem; background-color: #f3f4f6; border-radius: 0.5rem;">
                                    <div style="display: flex; align-items: center; justify-content: center; gap: 0.25rem; white-space: nowrap;">
                                        <span style="font-size: 0.75rem; color: #6b7280;">팔로잉</span>
                                        <span style="font-weight: 600; color: #111827; font-size: 0.875rem;">${matchedData.following ? Number(matchedData.following).toLocaleString() : '-'}</span>
                                    </div>
                                </div>
                                <div style="text-align: center; padding: 0.5rem; background-color: #f3f4f6; border-radius: 0.5rem;">
                                    <a href="${matchedData.out_link}" 
                                       target="_blank" 
                                       style="display: inline-flex; 
                                              align-items: center;
                                              justify-content: center;
                                              gap: 4px;
                                              width: 100%;
                                              padding: 0.25rem 0.75rem; 
                                              background-color: #f8f9fa; 
                                              color: #333; 
                                              text-decoration: none; 
                                              border-radius: 0.375rem; 
                                              font-weight: 500;
                                              font-size: 0.75rem;
                                              border: 1px solid #e9ecef;
                                              transition: all 0.2s;
                                              white-space: nowrap;"
                                       onmouseover="this.style.backgroundColor='#e9ecef'"
                                       onmouseout="this.style.backgroundColor='#f8f9fa'">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                        </svg>
                                        ${matchedData.out_link ? '외부링크' : '-'}
                                    </a>
                                </div>
                            </div>

                            <!-- 중단: 프로필 이미지와 정보 -->
                            <div style="display: grid; grid-template-columns: 75px 1fr; gap: 1rem;">
                                <!-- 좌측: 프로필 이미지 -->
                                <div class="profile-image" style="width: 75px; height: 75px;">
                                    ${matchedData.image_url ? `
                                        <a href="${matchedData.profile_link}" target="_blank" style="display: block; cursor: pointer; width: 100%; height: 100%;">
                                            <img src="${matchedData.image_url}" 
                                                alt="${matchedData.username}" 
                                                style="width: 100%; height: 100%; object-fit: cover; border-radius: 0.375rem;"
                                                onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzUiIGhlaWdodD0iNzUiIHZpZXdCb3g9IjAgMCA3NSA3NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNzUiIGhlaWdodD0iNzUiIGZpbGw9IiNFNUU3RUIiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzY2NiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='">
                                        </a>
                                    ` : `
                                        <a href="${matchedData.profile_link}" target="_blank" style="display: block; cursor: pointer; width: 100%; height: 100%;">
                                            <div class="no-image" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background-color: #E5E7EB; color: #666; font-size: 12px; border-radius: 0.375rem;">No Image</div>
                                        </a>
                                    `}
                                </div>

                                <!-- 우측: 인플루언서 정보 -->
                                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                                        <div style="font-weight: 600; font-size: 0.875rem;">${matchedData.clean_name}(${matchedData.username})</div>
                                        <div style="display: flex; align-items: center; gap: 0.25rem; white-space: nowrap;">
                                            <span style="font-size: 0.75rem; color: #6b7280;">릴스뷰</span>
                                            <span style="font-weight: 600; color: #111827; font-size: 0.875rem;">${matchedData.reels_views ? Number(matchedData.reels_views).toLocaleString() : '-'}</span>
                                        </div>
                                    </div>
                                    <div style="color: #4b5563; font-size: 0.875rem;">${matchedData.bio || '-'}</div>
                                </div>
                            </div>

                            <!-- 하단: 카테고리 바 -->
                            <div style="width: 100%;">
                                <div style="width: 100%; height: 20px; background-color: #f0f0f0; border-radius: 4px; overflow: hidden; position: relative;">
                                    <div style="height: 100%; display: flex; position: absolute; left: 0; top: 0; width: 100%;">
                                        ${matchedData.category ? matchedData.category.split(',').map(cat => {
                                            const [name, percent] = cat.trim().split('(');
                                            const percentage = parseInt(percent);
                                            const color = getCategoryColor(name);
                                            return `
                                                <div style="height: 100%; 
                                                          width: ${percentage}%; 
                                                          background-color: ${color}; 
                                                          display: flex; 
                                                          align-items: center; 
                                                          justify-content: center; 
                                                          color: black; 
                                                          font-size: 12px; 
                                                          white-space: nowrap; 
                                                          overflow: hidden; 
                                                          text-overflow: ellipsis; 
                                                          padding: 0 2px;">
                                                    ${name} (${percentage}%)
                                                </div>
                                            `;
                                        }).join('') : '-'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    influencerListContainer.appendChild(influencerDetailItem);

                    // 중앙 패널 리스트 업데이트
                    const listContainer = document.getElementById('related-influencers-list');
                    if (listContainer) {
                        listContainer.innerHTML = ''; // 기존 내용 초기화

                        if (relatedInfluencers.length === 0) {
                            // 관련 인플루언서가 없는 경우
                            const emptyMessage = document.createElement('div');
                            emptyMessage.style.padding = '1rem';
                            emptyMessage.style.textAlign = 'center';
                            emptyMessage.style.color = '#6b7280';
                            emptyMessage.textContent = '관련 인플루언서가 없습니다.';
                            listContainer.appendChild(emptyMessage);
                        } else {
                            // 일수 계산을 상위 스코프로 이동
                            const now = new Date();
                            const daysAgo = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

                            // 모든 인플루언서의 상품을 하나의 배열로 합치기
                            const allProducts = relatedInfluencers.flatMap(influencer => 
                                influencer.brand
                                    .filter(b => !excludedBrands.includes(b.name))
                                    .filter(b => !(b.name && (
                                        b.name.includes(influencer.username) || 
                                        b.name.includes(influencer.clean_name)
                                    )))
                                    .filter(b => {
                                        if (b.products && Array.isArray(b.products)) {
                                            return b.products.some(product => {
                                                if (product.mentioned_date) {
                                                    const mentionedDate = new Date(product.mentioned_date);
                                                    return mentionedDate >= daysAgo;
                                                }
                                                return false;
                                            });
                                        }
                                        return false;
                                    })
                                    .flatMap(brand => 
                                        brand.products
                                            .filter(p => {
                                                if (p.mentioned_date) {
                                                    const mentionedDate = new Date(p.mentioned_date);
                                                    return mentionedDate >= daysAgo;
                                                }
                                                return false;
                                            })
                                            .map(product => ({
                                                ...product,
                                                brandName: brand.name,
                                                isMatchingBrand: filteredBrands.some(fb => fb.name === brand.name),
                                                influencerName: influencer.clean_name,
                                                influencerUsername: influencer.username,
                                                influencerProfileLink: influencer.profile_link
                                            }))
                                    )
                            );

                            // 브랜드별로 그룹핑
                            groupedByBrand = allProducts.reduce((acc, product) => {
                                const brandName = product.brandName;
                                // 매칭 브랜드는 제외
                                if (filteredBrands.some(fb => fb.name === brandName)) {
                                    return acc;
                                }
                                if (!acc[brandName]) {
                                    acc[brandName] = {
                                        products: [],
                                        influencers: new Set()
                                    };
                                }
                                acc[brandName].products.push(product);
                                acc[brandName].influencers.add(product.influencerUsername);
                                return acc;
                            }, {});

                            // 각 브랜드 그룹 내에서 언급일시 기준으로 정렬
                            Object.keys(groupedByBrand).forEach(brandName => {
                                groupedByBrand[brandName].products.sort((a, b) => {
                                    const dateA = new Date(a.mentioned_date);
                                    const dateB = new Date(b.mentioned_date);
                                    return dateB.getTime() - dateA.getTime();
                                });
                            });

                            // 브랜드명 기준으로 정렬 (알파벳 순)을 인플루언서 수 기준으로 변경
                            const sortedBrandNames = Object.keys(groupedByBrand).sort((a, b) => {
                                const influencerCountA = groupedByBrand[a].influencers.size;
                                const influencerCountB = groupedByBrand[b].influencers.size;
                                
                                // 먼저 인플루언서 수로 정렬
                                if (influencerCountB !== influencerCountA) {
                                    return influencerCountB - influencerCountA;
                                }
                                
                                // 인플루언서 수가 같은 경우 상품 수로 정렬
                                const productCountA = groupedByBrand[a].products.length;
                                const productCountB = groupedByBrand[b].products.length;
                                if (productCountB !== productCountA) {
                                    return productCountB - productCountA;
                                }
                                
                                // 인플루언서 수와 상품 수가 모두 같은 경우 알파벳 순으로 정렬
                                return a.localeCompare(b);
                            });

                            // 통합 테이블 생성
                            const tableContainer = document.createElement('div');
                            tableContainer.style.padding = '0.75rem';
                            tableContainer.style.overflowX = 'auto';

                            const table = document.createElement('table');
                            table.style.width = '100%';
                            table.style.borderCollapse = 'collapse';
                            table.style.fontSize = '0.75rem';
                            table.style.tableLayout = 'fixed';
                            table.innerHTML = `
                                <thead>
                                    <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                                        <th style="width: 20%; padding: 0.5rem; text-align: left; font-weight: 500; color: #475569; font-size: 0.75rem;">인플루언서</th>
                                        <th style="width: 15%; padding: 0.5rem; text-align: left; font-weight: 500; color: #475569; font-size: 0.75rem;">브랜드</th>
                                        <th style="width: 25%; padding: 0.5rem; text-align: left; font-weight: 500; color: #475569; font-size: 0.75rem;">상품명</th>
                                        <th style="width: 20%; padding: 0.5rem; text-align: left; font-weight: 500; color: #475569; font-size: 0.75rem;">카테고리</th>
                                        <th style="width: 20%; padding: 0.5rem; text-align: left; font-weight: 500; color: #475569; font-size: 0.75rem;">언급일시</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${sortedBrandNames.map(brandName => {
                                        const brandData = groupedByBrand[brandName];
                                        const products = brandData.products;
                                        const influencerCount = brandData.influencers.size;
                                        return `
                                            <tr class="brand-group" data-brand="${brandName}">
                                                <td colspan="5" style="padding: 0;">
                                                    <div class="brand-header" 
                                                         style="background-color: #f8fafc; 
                                                                cursor: pointer; 
                                                                padding: 0.5rem;
                                                                display: flex;
                                                                align-items: center;
                                                                justify-content: space-between;
                                                                border-bottom: 1px solid #e2e8f0;
                                                                transition: background-color 0.2s ease;">
                                                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                                                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                                                <input type="checkbox" 
                                                                       class="brand-checkbox" 
                                                                       style="width: 1rem; 
                                                                              height: 1rem; 
                                                                              cursor: pointer;
                                                                              accent-color: #2563eb;"
                                                                       onchange="const header = this.closest('.brand-header'); 
                                                                                header.style.backgroundColor = this.checked ? '#DBEAFE' : '#f8fafc';"
                                                                       onclick="event.stopPropagation();">
                                                                <span style="font-weight: 500; color: #374151; font-size: 0.75rem;">${brandName}</span>
                                                            </div>
                                                            <div style="display: flex; align-items: center; gap: 0.5rem; color: #6b7280; font-size: 0.625rem;">
                                                                <span style="display: inline-flex; align-items: center; gap: 0.25rem; 
                                                                           background-color: #E0F2FE; 
                                                                           color: #0369A1; 
                                                                           padding: 0.125rem 0.375rem; 
                                                                           border-radius: 0.25rem;
                                                                           font-weight: 500;">
                                                                    <span>상품</span>
                                                                    <span style="font-weight: 600;">${products.length}</span>
                                                                </span>
                                                                <span style="display: inline-flex; align-items: center; gap: 0.25rem; 
                                                                           background-color: #FEF3C7; 
                                                                           color: #92400E; 
                                                                           padding: 0.125rem 0.375rem; 
                                                                           border-radius: 0.25rem;
                                                                           font-weight: 500;">
                                                                    <span>인플루언서</span>
                                                                    <span style="font-weight: 600;">${influencerCount}</span>
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <svg class="toggle-icon" 
                                                             width="16" 
                                                             height="16" 
                                                             viewBox="0 0 24 24" 
                                                             fill="none" 
                                                             stroke="currentColor" 
                                                             stroke-width="2" 
                                                             stroke-linecap="round" 
                                                             stroke-linejoin="round"
                                                             style="transition: transform 0.2s ease;">
                                                            <polyline points="6 9 12 15 18 9"></polyline>
                                                        </svg>
                                                    </div>
                                                    <div class="brand-content" style="display: none;">
                                                        <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
                                                            <tbody>
                                                                ${products.map(product => {
                                                                    const influencer = relatedInfluencers.find(i => 
                                                                        i.username === product.influencerUsername || 
                                                                        i.clean_name === product.influencerName
                                                                    );
                                                                    const reelsViews = influencer ? Number(influencer.reels_views).toLocaleString() : '-';
                                                                    return `
                                                                        <tr style="border-bottom: 1px solid #e2e8f0;">
                                                                            <td style="width: 20%; padding: 0.5rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                                                                <a href="${product.influencerProfileLink}" 
                                                                                   target="_blank" 
                                                                                   style="color: #2563eb; 
                                                                                          text-decoration: none; 
                                                                                          font-weight: 500; 
                                                                                          font-size: 0.75rem;
                                                                                          display: flex;
                                                                                          flex-direction: column;
                                                                                          gap: 0.125rem;
                                                                                          position: relative;">
                                                                                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                                                                                        <span title="@${product.influencerUsername}" style="overflow: hidden; text-overflow: ellipsis;">${product.influencerName}</span>
                                                                                    </div>
                                                                                    <div style="display: flex; align-items: center; gap: 0.25rem; color: #6b7280; font-size: 0.625rem;">
                                                                                        <span>릴스뷰</span>
                                                                                        <span style="font-weight: 500; color: #374151;">${reelsViews}</span>
                                                                                    </div>
                                                                                </a>
                                                                            </td>
                                                                            <td style="width: 15%; padding: 0.5rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                                                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                                                                    <span style="font-weight: 500; color: #374151; font-size: 0.75rem;">
                                                                                        ${product.brandName}
                                                                                    </span>
                                                                                </div>
                                                                            </td>
                                                                            <td style="width: 25%; padding: 0.5rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem;">${product.item || '-'}</td>
                                                                            <td style="width: 20%; padding: 0.5rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem;">${product.category || '-'}</td>
                                                                            <td style="width: 20%; padding: 0.5rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #6b7280; font-size: 0.75rem;">
                                                                                ${product.item_feed_link ? `
                                                                                    <a href="${product.item_feed_link}" 
                                                                                       target="_blank" 
                                                                                       style="color: #6b7280; 
                                                                                              text-decoration: none;
                                                                                              cursor: pointer;
                                                                                              transition: color 0.2s;"
                                                                                       onmouseover="this.style.color='#2563eb'"
                                                                                       onmouseout="this.style.color='#6b7280'">
                                                                                        ${product.mentioned_date ? new Date(product.mentioned_date).toLocaleString() : '-'}
                                                                                    </a>
                                                                                ` : (product.mentioned_date ? new Date(product.mentioned_date).toLocaleString() : '-')}
                                                                            </td>
                                                                        </tr>
                                                                    `;
                                                                }).join('')}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            `;
                            tableContainer.appendChild(table);
                            listContainer.appendChild(tableContainer);

                            // 브랜드 그룹 토글 이벤트 리스너 추가
                            const brandHeaders = tableContainer.querySelectorAll('.brand-header');
                            brandHeaders.forEach(header => {
                                const checkbox = header.querySelector('.brand-checkbox');
                                checkbox.addEventListener('change', (event) => {
                                    const brandGroup = header.closest('.brand-group');
                                    const brandName = brandGroup.dataset.brand;
                                    
                                    // 체크박스 상태에 따라 헤더 배경색 변경
                                    header.style.backgroundColor = event.target.checked ? '#DBEAFE' : '#f8fafc';
                                    
                                    // 우측 패널 업데이트
                                    updateRightPanel(groupedByBrand);
                                });

                                header.addEventListener('click', (event) => {
                                    // 체크박스 클릭 시 이벤트 전파 중단
                                    if (event.target.type === 'checkbox') {
                                        return;
                                    }
                                    
                                    const brandGroup = header.closest('.brand-group');
                                    const content = brandGroup.querySelector('.brand-content');
                                    const icon = header.querySelector('.toggle-icon');
                                    
                                    if (content.style.display === 'none') {
                                        content.style.display = 'block';
                                        icon.style.transform = 'rotate(180deg)';
                                    } else {
                                        content.style.display = 'none';
                                        icon.style.transform = 'rotate(0deg)';
                                    }
                                });
                            });
                        }
                    }
                    console.groupEnd();

                    // 이미지 URL 처리
                    const imageUrl = matchedData.image_url;

                    const listItem = document.createElement('div');
                    listItem.className = 'list-item influencer-detail';
                    listItem.innerHTML = `
                        <div class="detail-section" style="display: flex; flex-direction: column; gap: 1rem;">
                            <!-- 상단: 통계 정보 -->
                            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; margin-bottom: 0.5rem;">
                                <div style="text-align: center; padding: 0.5rem; background-color: #f3f4f6; border-radius: 0.5rem;">
                                    <div style="display: flex; align-items: center; justify-content: center; gap: 0.25rem; white-space: nowrap;">
                                        <span style="font-size: 0.75rem; color: #6b7280;">게시물</span>
                                        <span style="font-weight: 600; color: #111827; font-size: 0.875rem;">${matchedData.posts ? Number(matchedData.posts).toLocaleString() : '-'}</span>
                                    </div>
                                </div>
                                <div style="text-align: center; padding: 0.5rem; background-color: #f3f4f6; border-radius: 0.5rem;">
                                    <div style="display: flex; align-items: center; justify-content: center; gap: 0.25rem; white-space: nowrap;">
                                        <span style="font-size: 0.75rem; color: #6b7280;">팔로워</span>
                                        <span style="font-weight: 600; color: #111827; font-size: 0.875rem;">${matchedData.followers ? Number(matchedData.followers).toLocaleString() : '-'}</span>
                                    </div>
                                </div>
                                <div style="text-align: center; padding: 0.5rem; background-color: #f3f4f6; border-radius: 0.5rem;">
                                    <div style="display: flex; align-items: center; justify-content: center; gap: 0.25rem; white-space: nowrap;">
                                        <span style="font-size: 0.75rem; color: #6b7280;">팔로잉</span>
                                        <span style="font-weight: 600; color: #111827; font-size: 0.875rem;">${matchedData.following ? Number(matchedData.following).toLocaleString() : '-'}</span>
                                    </div>
                                </div>
                                <div style="text-align: center; padding: 0.5rem; background-color: #f3f4f6; border-radius: 0.5rem;">
                                    <a href="${matchedData.out_link}" 
                                       target="_blank" 
                                       style="display: inline-flex; 
                                              align-items: center;
                                              justify-content: center;
                                              gap: 4px;
                                              width: 100%;
                                              padding: 0.25rem 0.75rem; 
                                              background-color: #f8f9fa; 
                                              color: #333; 
                                              text-decoration: none; 
                                              border-radius: 0.375rem; 
                                              font-weight: 500;
                                              font-size: 0.75rem;
                                              border: 1px solid #e9ecef;
                                              transition: all 0.2s;
                                              white-space: nowrap;"
                                       onmouseover="this.style.backgroundColor='#e9ecef'"
                                       onmouseout="this.style.backgroundColor='#f8f9fa'">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                        </svg>
                                        ${matchedData.out_link ? '외부링크' : '-'}
                                    </a>
                                </div>
                            </div>

                            <!-- 중단: 프로필 이미지와 정보 -->
                            <div style="display: grid; grid-template-columns: 75px 1fr; gap: 1rem;">
                                <!-- 좌측: 프로필 이미지 -->
                                <div class="profile-image" style="width: 75px; height: 75px;">
                                    ${matchedData.image_url ? `
                                        <a href="${matchedData.profile_link}" target="_blank" style="display: block; cursor: pointer; width: 100%; height: 100%;">
                                            <img src="${matchedData.image_url}" 
                                                alt="${matchedData.username}" 
                                                style="width: 100%; height: 100%; object-fit: cover;"
                                                onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzUiIGhlaWdodD0iNzUiIHZpZXdCb3g9IjAgMCA3NSA3NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNzUiIGhlaWdodD0iNzUiIGZpbGw9IiNFNUU3RUIiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzY2NiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='">
                                        </a>
                                    ` : `
                                        <a href="${matchedData.profile_link}" target="_blank" style="display: block; cursor: pointer; width: 100%; height: 100%;">
                                            <div class="no-image" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background-color: #E5E7EB; color: #666; font-size: 12px;">No Image</div>
                                        </a>
                                    `}
                                </div>

                                <!-- 우측: 인플루언서 정보 -->
                                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                                        <div style="font-weight: 600;">${matchedData.clean_name}(${matchedData.username})</div>
                                        <div style="display: flex; align-items: center; gap: 0.25rem; white-space: nowrap;">
                                            <span style="font-size: 0.75rem; color: #6b7280;">릴스뷰</span>
                                            <span style="font-weight: 600; color: #111827; font-size: 0.875rem;">${matchedData.reels_views ? Number(matchedData.reels_views).toLocaleString() : '-'}</span>
                                        </div>
                                    </div>
                                    <div style="color: #4b5563; font-size: 0.875rem;">${matchedData.bio || '-'}</div>
                                </div>
                            </div>

                            <!-- 하단: 카테고리 바 -->
                            <div style="width: 100%;">
                                <div style="width: 100%; height: 20px; background-color: #f0f0f0; border-radius: 4px; overflow: hidden; position: relative;">
                                    <div style="height: 100%; display: flex; position: absolute; left: 0; top: 0; width: 100%;">
                                        ${matchedData.category ? matchedData.category.split(',').map(cat => {
                                            const [name, percent] = cat.trim().split('(');
                                            const percentage = parseInt(percent);
                                            const color = getCategoryColor(name);
                                            return `
                                                <div style="height: 100%; 
                                                          width: ${percentage}%; 
                                                          background-color: ${color}; 
                                                          display: flex; 
                                                          align-items: center; 
                                                          justify-content: center; 
                                                          color: black; 
                                                          font-size: 12px; 
                                                          white-space: nowrap; 
                                                          overflow: hidden; 
                                                          text-overflow: ellipsis; 
                                                          padding: 0 2px;">
                                                    ${name} (${percentage}%)
                                                </div>
                                            `;
                                        }).join('') : '-'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    listContainer.appendChild(listItem);

                    // 브랜드 리스트 컨테이너 초기화
                    const brandListContainer = leftContent.querySelector('#brand-list');
                    const existingBrandItems = brandListContainer.querySelectorAll('.list-item:not(.list-header)');
                    existingBrandItems.forEach(item => item.remove());

                    // 브랜드 정보가 있는 경우 표시
                    if (matchedData.brand && Array.isArray(matchedData.brand) && matchedData.brand.length > 0) {
                        // 제외할 브랜드 목록
                        const excludedBrands = ['확인필요', 'n', 'N', 'N/A', '복합상품'];
                        
                        // 필터링된 브랜드 목록 생성
                        const filteredBrands = matchedData.brand.filter(brand => {
                            // 제외 브랜드 목록에 있는 경우 제외
                            if (excludedBrands.includes(brand.name)) {
                                return false;
                            }
                            
                            // 인플루언서의 username이나 clean_name이 브랜드명에 포함된 경우 제외
                            if (brand.name && (
                                brand.name.includes(matchedData.username) || 
                                brand.name.includes(matchedData.clean_name)
                            )) {
                                return false;
                            }

                            // 사용자가 입력한 일수 이내의 상품이 있는지 확인
                            if (brand.products && Array.isArray(brand.products)) {
                                const now = new Date();
                                const daysAgo = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
                                
                                // 입력한 일수 이내의 상품이 하나라도 있는지 확인
                                const hasRecentProducts = brand.products.some(product => {
                                    if (product.mentioned_date) {
                                        const mentionedDate = new Date(product.mentioned_date);
                                        return mentionedDate >= daysAgo;
                                    }
                                    return false;
                                });

                                // 입력한 일수 이내의 상품이 없는 경우 제외
                                if (!hasRecentProducts) {
                                    return false;
                                }

                                // 입력한 일수 이내의 상품만 필터링
                                brand.products = brand.products.filter(product => {
                                    if (product.mentioned_date) {
                                        const mentionedDate = new Date(product.mentioned_date);
                                        return mentionedDate >= daysAgo;
                                    }
                                    return false;
                                });
                            }
                            
                            return true;
                        });

                        // 필터링된 브랜드가 있는 경우에만 표시
                        if (filteredBrands.length > 0) {
                            const brandListItem = document.createElement('div');
                            brandListItem.className = 'list-item brand-detail';
                            brandListItem.innerHTML = `
                                <div class="detail-section" style="padding: 1rem;">
                                    <div style="margin-bottom: 1rem; padding: 0.5rem; background-color: #f8f9fa; border-radius: 0.5rem; font-size: 0.875rem; color: #666;">
                                        최근 ${days}일 이내의 언급 데이터만 표시됩니다.
                                    </div>
                                    ${filteredBrands.map((brand, index) => `
                                        <div class="brand-item" style="margin-bottom: 0.5rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; overflow: hidden;">
                                            <div class="brand-header" 
                                                 style="padding: 0.75rem; 
                                                        background-color: #f3f4f6; 
                                                        border-bottom: 1px solid #e5e7eb; 
                                                        font-weight: 500;
                                                        cursor: pointer;
                                                        display: flex;
                                                        justify-content: space-between;
                                                        align-items: center;">
                                                <span>${brand.name || '-'}</span>
                                                <svg class="toggle-icon" 
                                                     width="16" 
                                                     height="16" 
                                                     viewBox="0 0 24 24" 
                                                     fill="none" 
                                                     stroke="currentColor" 
                                                     stroke-width="2" 
                                                     stroke-linecap="round" 
                                                     stroke-linejoin="round"
                                                     style="transition: transform 0.2s ease;">
                                                    <polyline points="6 9 12 15 18 9"></polyline>
                                                </svg>
                                            </div>
                                            <div class="brand-content hidden" 
                                                 style="display: none; 
                                                        padding: 0.75rem; 
                                                        background-color: #fff;">
                                                ${brand.products && Array.isArray(brand.products) && brand.products.length > 0 ? `
                                                    ${brand.products.map(product => `
                                                        <div style="margin-bottom: 0.5rem; padding: 0.5rem; background-color: #f9fafb; border-radius: 0.375rem;">
                                                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                                                                <span style="font-weight: 500;">${product.item || '-'}</span>
                                                                <span style="color: #6b7280; font-size: 0.875rem;">${product.type || '-'}</span>
                                                            </div>
                                                            <div style="display: flex; gap: 0.5rem; font-size: 0.875rem; color: #4b5563;">
                                                                <span>${product.category || '-'}</span>
                                                                ${product.category2 ? `<span>${product.category2}</span>` : ''}
                                                            </div>
                                                            <div style="display: flex; gap: 0.5rem; font-size: 0.875rem; color: #4b5563; margin-top: 0.25rem;">
                                                                <span>언급일시: ${product.mentioned_date ? new Date(product.mentioned_date).toLocaleString() : '-'}</span>
                                                                ${product.expected_date ? `<span>예상일시: ${product.expected_date}</span>` : ''}
                                                            </div>
                                                            ${product.item_feed_link ? `
                                                                <div style="margin-top: 0.25rem;">
                                                                    <a href="${product.item_feed_link}" 
                                                                       target="_blank" 
                                                                       style="color: #2563eb; text-decoration: none; font-size: 0.875rem; display: inline-flex; align-items: center; gap: 0.25rem;">
                                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                                                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                                                        </svg>
                                                                        피드 링크
                                                                    </a>
                                                                </div>
                                                            ` : ''}
                                                        </div>
                                                    `).join('')}
                                                ` : `
                                                    <div style="padding: 0.75rem; color: #6b7280; font-size: 0.875rem;">
                                                        등록된 상품이 없습니다.
                                                    </div>
                                                `}
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            `;
                            brandListContainer.appendChild(brandListItem);

                            // 브랜드 헤더 클릭 이벤트 리스너 추가
                            const brandHeaders = brandListItem.querySelectorAll('.brand-header');
                            brandHeaders.forEach(header => {
                                header.addEventListener('click', () => {
                                    const content = header.parentElement.querySelector('.brand-content');
                                    const icon = header.querySelector('.toggle-icon');
                                    
                                    if (content.classList.contains('hidden')) {
                                        content.classList.remove('hidden');
                                        content.style.display = 'block';
                                        icon.style.transform = 'rotate(180deg)';
                                    } else {
                                        content.classList.add('hidden');
                                        content.style.display = 'none';
                                        icon.style.transform = 'rotate(0deg)';
                                    }
                                });
                            });
                        } else {
                            // 필터링된 브랜드가 없는 경우 메시지 표시
                            const brandListItem = document.createElement('div');
                            brandListItem.className = 'list-item brand-detail';
                            brandListItem.innerHTML = `
                                <div class="detail-section" style="padding: 1rem; color: #6b7280; font-size: 0.875rem;">
                                    표시할 브랜드 정보가 없습니다.
                                </div>
                            `;
                            brandListContainer.appendChild(brandListItem);
                        }
                    }

                    // 성공 토스트 메시지로 변경
                    toast.className = 'toast-message success';
                    toast.innerHTML = `
                        <span class="toast-icon">✓</span>
                        <span class="toast-text">데이터를 불러왔습니다.</span>
                    `;
                } else {
                    // 데이터 없음 토스트 메시지
                    toast.className = 'toast-message warning';
                    toast.innerHTML = `
                        <span class="toast-icon" style="font-size: 1.2rem;">⚠</span>
                        <span class="toast-text" style="font-weight: 500;">'${username}' 사용자를 찾을 수 없습니다.</span>
                    `;
                    toast.style.backgroundColor = '#fff3cd';
                    toast.style.borderColor = '#ffeeba';
                    toast.style.color = '#856404';
                }
            } catch (error) {
                console.error('인플루언서 데이터 조회 실패:', error);
                // 에러 토스트 메시지
                const toast = document.createElement('div');
                toast.className = 'toast-message error';
                toast.innerHTML = `
                    <span class="toast-icon">✕</span>
                    <span class="toast-text">데이터 조회 중 오류가 발생했습니다.</span>
                `;
                document.body.appendChild(toast);
            } finally {
                // 5초 후 토스트 메시지 제거 (기존 3초에서 5초로 변경)
                setTimeout(() => {
                    const toast = document.querySelector('.toast-message');
                    if (toast) {
                        toast.classList.add('fade-out');
                        setTimeout(() => toast.remove(), 300);
                    }
                }, 5000);
            }
        });

        // Enter 키 입력 시에도 조회 실행
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchBtn.click();
            }
        });
    }

    if (centerContent) {
        centerContent.innerHTML = `
            <div class="panel-header">
                <h3>브랜드 매칭 인플루언서 목록</h3>
            </div>
            <div id="related-influencers-list" style="padding: 1rem;">
                <!-- 리스트 내용이 여기에 동적으로 추가됩니다 -->
            </div>
        `;
    }
    if (rightContent) {
        rightContent.innerHTML = '';
    }

    // 브레드크럼 업데이트
    const breadcrumbMain = document.getElementById('breadcrumb-main');
    const breadcrumbCurrent = document.getElementById('breadcrumb-current');
    
    if (breadcrumbMain) {
        breadcrumbMain.textContent = '벤더';
    }
    if (breadcrumbCurrent) {
        breadcrumbCurrent.textContent = '브랜드 매칭';
    }
}

// 카테고리별 색상 반환 함수 추가
function getCategoryColor(category) {
    const colorMap = {
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
    return colorMap[category] || '#E0E0E0';
}

// 우측 패널 업데이트 함수
async function updateRightPanel(groupedByBrand) {
    const rightContent = document.getElementById('brand-match-right-content');
    if (!rightContent) return;

    // 현재 검색된 인플루언서의 clean_name 가져오기
    const influencerDetail = document.querySelector('.influencer-detail');
    const influencerName = influencerDetail ? 
        influencerDetail.querySelector('.detail-section div:nth-child(2) div:nth-child(1) div').textContent.split('(')[0].trim() : 
        '';

    // 체크된 브랜드와 복제된 브랜드를 분리하여 저장
    const checkedBrands = Array.from(document.querySelectorAll('.brand-checkbox:checked')).map(checkbox => {
        const brandGroup = checkbox.closest('.brand-group');
        const brandName = brandGroup.dataset.brand;
        const brandData = groupedByBrand[brandName];
        return { brandName, brandData, isOriginal: true };
    });

    // 복제된 브랜드들을 원본 브랜드별로 그룹화
    const duplicatedGroups = new Map();
    duplicatedBrands.forEach(brandName => {
        const originalBrandName = brandName.replace('_복제', '');
        const brandData = groupedByBrand[originalBrandName];
        if (brandData) {
            if (!duplicatedGroups.has(originalBrandName)) {
                duplicatedGroups.set(originalBrandName, []);
            }
            duplicatedGroups.get(originalBrandName).push({ 
                brandName,
                displayName: originalBrandName,
                brandData, 
                isOriginal: false 
            });
        }
    });

    // 최종 브랜드 목록 생성 (원본 브랜드와 그 복제본을 함께 배치)
    const selectedBrands = [];
    for (const { brandName, brandData, isOriginal } of checkedBrands) {
        // 브랜드 웹사이트 URL 가져오기
        const websiteUrl = await window.api.getBrandWebsiteUrl(brandName);
        
        // 원본 브랜드 추가
        selectedBrands.push({ 
            brandName, 
            displayName: brandName,
            brandData, 
            isOriginal,
            websiteUrl
        });
        
        // 해당 브랜드의 복제본들 추가
        const duplicates = duplicatedGroups.get(brandName) || [];
        selectedBrands.push(...duplicates.map(dup => ({
            ...dup,
            websiteUrl // 복제본도 같은 웹사이트 URL 사용
        })));
    }

    // 우측 패널 내용 업데이트
    rightContent.innerHTML = `
        <div class="panel-header" style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
            <h3>제안 브랜드 정보</h3>
            ${selectedBrands.length > 0 ? `
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <button id="download-excel-btn" 
                            style="display: inline-flex; 
                                   align-items: center; 
                                   gap: 0.5rem;
                                   padding: 0.5rem 1rem;
                                   background-color: #2563eb;
                                   color: white;
                                   border: none;
                                   border-radius: 0.375rem;
                                   font-size: 0.875rem;
                                   font-weight: 500;
                                   cursor: pointer;
                                   transition: background-color 0.2s;"
                            onmouseover="this.style.backgroundColor='#1d4ed8'"
                            onmouseout="this.style.backgroundColor='#2563eb'">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        엑셀 다운로드
                    </button>
                    <button id="notion-upload-btn"
                            style="display: inline-flex; 
                                   align-items: center; 
                                   gap: 0.5rem;
                                   padding: 0.5rem 1rem;
                                   background-color: #10b981;
                                   color: white;
                                   border: none;
                                   border-radius: 0.375rem;
                                   font-size: 0.875rem;
                                   font-weight: 500;
                                   cursor: pointer;
                                   transition: background-color 0.2s;"
                            onmouseover="this.style.backgroundColor='#059669'"
                            onmouseout="this.style.backgroundColor='#10b981'">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <path d="M16 3v4a1 1 0 0 0 1 1h4"></path>
                        </svg>
                        노션 업로드
                    </button>
                </div>
            ` : ''}
        </div>
        <div style="padding: 1rem;">
            ${selectedBrands.length > 0 ? `
                <div style="margin-bottom: 0.5rem; padding: 0.5rem; background-color: #f8f9fa; border-radius: 0.5rem; font-size: 0.75rem; color: #666;">
                    * 주요 상품을 더블클릭하여 수정할 수 있습니다.
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
                    <thead>
                        <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                            <th style="padding: 0.75rem; text-align: left; font-weight: 500; color: #475569; width: 40px;"></th>
                            <th style="padding: 0.75rem; text-align: left; font-weight: 500; color: #475569;">브랜드</th>
                            <th style="padding: 0.75rem; text-align: left; font-weight: 500; color: #475569;">주요 상품</th>
                            <th style="padding: 0.75rem; text-align: left; font-weight: 500; color: #475569;">링크</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${selectedBrands.map(({ brandName, displayName, brandData, isOriginal, websiteUrl }) => {
                            // 상품명 빈도수 계산
                            const itemFrequency = brandData.products.reduce((acc, product) => {
                                const item = product.item || '미상';
                                acc[item] = (acc[item] || 0) + 1;
                                return acc;
                            }, {});

                            // 가장 빈도수가 높은 상품명 찾기
                            const mostFrequentItem = Object.entries(itemFrequency)
                                .sort((a, b) => b[1] - a[1])[0]?.[0] || '미상';

                            return `
                                <tr style="border-bottom: 1px solid #e2e8f0;" data-brand="${brandName}" data-original="${isOriginal}">
                                    <td style="padding: 0.75rem; text-align: center;">
                                        <div style="display: flex; gap: 0.25rem; justify-content: center;">
                                            <button class="remove-brand-btn" 
                                                    style="display: inline-flex;
                                                           align-items: center;
                                                           justify-content: center;
                                                           width: 24px;
                                                           height: 24px;
                                                           padding: 0;
                                                           background-color: #fee2e2;
                                                           color: #dc2626;
                                                           border: none;
                                                           border-radius: 0.25rem;
                                                           cursor: pointer;
                                                           transition: all 0.2s;"
                                                    onmouseover="this.style.backgroundColor='#fecaca'"
                                                    onmouseout="this.style.backgroundColor='#fee2e2'">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                                </svg>
                                            </button>
                                            ${isOriginal ? `
                                                <button class="duplicate-brand-btn"
                                                        style="display: inline-flex;
                                                               align-items: center;
                                                               justify-content: center;
                                                               width: 24px;
                                                               height: 24px;
                                                               padding: 0;
                                                               background-color: #dbeafe;
                                                               color: #2563eb;
                                                               border: none;
                                                               border-radius: 0.25rem;
                                                               cursor: pointer;
                                                               transition: all 0.2s;"
                                                        onmouseover="this.style.backgroundColor='#bfdbfe'"
                                                        onmouseout="this.style.backgroundColor='#dbeafe'">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                                    </svg>
                                                </button>
                                            ` : ''}
                                        </div>
                                    </td>
                                    <td style="padding: 0.75rem; font-weight: 500; color: #374151;">${displayName}</td>
                                    <td style="padding: 0.75rem; color: #4b5563;">
                                        <div class="editable-item" 
                                             data-brand="${brandName}"
                                             style="cursor: pointer; 
                                                    padding: 0.25rem; 
                                                    border-radius: 0.25rem;
                                                    transition: background-color 0.2s;"
                                             onmouseover="this.style.backgroundColor='#f3f4f6'"
                                             onmouseout="this.style.backgroundColor='transparent'"
                                             ondblclick="this.contentEditable=true; this.focus(); this.style.backgroundColor='#e5e7eb';">
                                            ${editedItems[brandName] || mostFrequentItem || ''}
                                        </div>
                                    </td>
                                    <td style="padding: 0.75rem; color: #4b5563;">
                                        ${websiteUrl ? `
                                            <a href="${websiteUrl}" 
                                               target="_blank" 
                                               style="color: #2563eb; 
                                                      text-decoration: none; 
                                                      display: inline-flex; 
                                                      align-items: center; 
                                                      gap: 0.25rem;
                                                      font-size: 0.875rem;"
                                               onmouseover="this.style.textDecoration='underline'"
                                               onmouseout="this.style.textDecoration='none'">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                                </svg>
                                                웹사이트
                                            </a>
                                        ` : '-'}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            ` : `
                <div style="padding: 1rem; text-align: center; color: #6b7280; font-size: 0.875rem;">
                    선택된 브랜드가 없습니다.
                </div>
            `}
        </div>
    `;

    // 수정 가능한 상품명에 이벤트 리스너 추가
    const editableItems = rightContent.querySelectorAll('.editable-item');
    editableItems.forEach(item => {
        // 편집 완료 시 이벤트
        item.addEventListener('blur', () => {
            item.contentEditable = false;
            item.style.backgroundColor = 'transparent';
            const brandName = item.dataset.brand;
            editedItems[brandName] = item.textContent.trim();
        });

        // Enter 키 입력 시 편집 완료
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                item.blur();
            }
        });
    });

    // 삭제 버튼 이벤트 리스너 추가
    const removeButtons = rightContent.querySelectorAll('.remove-brand-btn');
    removeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const row = button.closest('tr');
            const brandName = row.dataset.brand;
            const isOriginal = row.dataset.original === 'true';
            
            if (isOriginal) {
                // 중앙 패널의 체크박스 해제
                const centerCheckbox = document.querySelector(`.brand-group[data-brand="${brandName}"] .brand-checkbox`);
                if (centerCheckbox) {
                    centerCheckbox.checked = false;
                    const header = centerCheckbox.closest('.brand-header');
                    header.style.backgroundColor = '#f8fafc';
                }
            } else {
                // 복제된 브랜드인 경우 복제 목록에서 제거
                duplicatedBrands.delete(brandName);
            }
            
            // 우측 패널에서 행 제거
            row.remove();
            
            // 수정된 상품명에서도 제거
            delete editedItems[brandName];
            
            // 브랜드가 모두 제거된 경우 메시지 표시
            if (rightContent.querySelectorAll('tbody tr').length === 0) {
                rightContent.querySelector('div[style*="padding: 1rem;"]').innerHTML = `
                    <div style="padding: 1rem; text-align: center; color: #6b7280; font-size: 0.875rem;">
                        선택된 브랜드가 없습니다.
                    </div>
                `;
                rightContent.querySelector('.panel-header').querySelector('#download-excel-btn')?.remove();
            }
        });
    });

    // 복제 버튼 이벤트 리스너 추가
    const duplicateButtons = rightContent.querySelectorAll('.duplicate-brand-btn');
    duplicateButtons.forEach(button => {
        button.addEventListener('click', () => {
            const row = button.closest('tr');
            const brandName = row.dataset.brand;
            const brandData = groupedByBrand[brandName];
            const currentItem = row.querySelector('.editable-item').textContent.trim();
            
            // 새로운 브랜드명 생성
            const newBrandName = `${brandName}_복제`;
            duplicatedBrands.add(newBrandName);
            
            // 새로운 행 생성
            const newRow = row.cloneNode(true);
            
            // 새로운 행의 데이터 속성과 내용 업데이트
            newRow.dataset.brand = newBrandName;
            newRow.dataset.original = 'false';
            const editableItem = newRow.querySelector('.editable-item');
            editableItem.dataset.brand = newBrandName;
            editableItem.textContent = currentItem;
            
            // 복제 버튼 제거
            const duplicateBtn = newRow.querySelector('.duplicate-brand-btn');
            if (duplicateBtn) {
                duplicateBtn.parentElement.removeChild(duplicateBtn);
            }
            
            // 수정된 상품명 저장
            editedItems[newBrandName] = currentItem;
            
            // 행 삽입
            row.parentNode.insertBefore(newRow, row.nextSibling);
            
            // 새 행의 이벤트 리스너 추가
            const newEditableItem = newRow.querySelector('.editable-item');
            newEditableItem.addEventListener('blur', () => {
                newEditableItem.contentEditable = false;
                newEditableItem.style.backgroundColor = 'transparent';
                editedItems[newBrandName] = newEditableItem.textContent.trim();
            });
            newEditableItem.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    newEditableItem.blur();
                }
            });
            
            // 새 행의 삭제 버튼 이벤트 리스너 추가
            const newRemoveButton = newRow.querySelector('.remove-brand-btn');
            newRemoveButton.addEventListener('click', () => {
                newRow.remove();
                duplicatedBrands.delete(newBrandName);
                delete editedItems[newBrandName];
                
                // 브랜드가 모두 제거된 경우 메시지 표시
                if (rightContent.querySelectorAll('tbody tr').length === 0) {
                    rightContent.querySelector('div[style*="padding: 1rem;"]').innerHTML = `
                        <div style="padding: 1rem; text-align: center; color: #6b7280; font-size: 0.875rem;">
                            선택된 브랜드가 없습니다.
                        </div>
                    `;
                    rightContent.querySelector('.panel-header').querySelector('#download-excel-btn')?.remove();
                }
            });
        });
    });

    // 엑셀 다운로드 버튼 이벤트 리스너 수정
    const downloadBtn = rightContent.querySelector('#download-excel-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            // 엑셀 데이터 생성
            const excelData = selectedBrands.map(({ brandName, displayName, brandData, websiteUrl }) => {
                // 상품명 빈도수 계산 (수정되지 않은 경우를 위해)
                const itemFrequency = brandData.products.reduce((acc, product) => {
                    const item = product.item || '미상';
                    acc[item] = (acc[item] || 0) + 1;
                    return acc;
                }, {});

                // 가장 빈도수가 높은 상품명 찾기
                const mostFrequentItem = Object.entries(itemFrequency)
                    .sort((a, b) => b[1] - a[1])[0]?.[0] || '미상';

                return {
                    브랜드: String(displayName || ''),
                    '주요 상품': String(editedItems[brandName] || mostFrequentItem || ''),
                    '웹사이트': String(websiteUrl || '')
                };
            });

            // CSV 데이터 생성
            const headers = ['브랜드', '주요 상품', '웹사이트'];
            const csvContent = [
                headers.join(','),
                ...excelData.map(row => 
                    headers.map(header => {
                        const value = String(row[header] || '');
                        // 쉼표나 따옴표가 포함된 경우 따옴표로 감싸기
                        return value.includes(',') || value.includes('"') 
                            ? `"${value.replace(/"/g, '""')}"` 
                            : value;
                    }).join(',')
                )
            ].join('\n');

            // BOM 추가 (한글 깨짐 방지)
            const BOM = '\uFEFF';
            const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            // 파일명에 인플루언서 이름과 현재 날짜 추가
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const fileName = influencerName ? 
                `${influencerName}_제안브랜드정보_${dateStr}.csv` : 
                `제안브랜드정보_${dateStr}.csv`;
            
            link.download = fileName;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            // 다운로드 완료 토스트 메시지 수정
            const toast = document.createElement('div');
            toast.className = 'toast-message success';
            toast.innerHTML = `
                <span class="toast-icon">✓</span>
                <span class="toast-text">${fileName} 파일이 다운로드되었습니다.</span>
            `;
            document.body.appendChild(toast);
            setTimeout(() => {
                toast.classList.add('fade-out');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        });
    }
    // 노션 업로드 버튼 이벤트 리스너 추가
    const notionBtn = rightContent.querySelector('#notion-upload-btn');
    if (notionBtn) {
        notionBtn.addEventListener('click', async () => {
            // 버튼 비활성화
            notionBtn.disabled = true;
            notionBtn.style.opacity = '0.5';
            notionBtn.style.cursor = 'not-allowed';

            // 로딩 토스트 메시지
            const toast = document.createElement('div');
            toast.className = 'toast-message loading';
            toast.innerHTML = `
                <span class="toast-icon">⌛</span>
                <span class="toast-text">노션 업로드 중...</span>
            `;
            document.body.appendChild(toast);

            try {
                // 현재 조회된 인플루언서의 clean_name 가져오기
                const influencerDetail = document.querySelector('.influencer-detail');
                const cleanName = influencerDetail ? 
                    influencerDetail.querySelector('.detail-section div:nth-child(2) div:nth-child(1) div').textContent.split('(')[0].trim() : 
                    null;

                if (!cleanName) {
                    throw new Error('인플루언서 정보를 찾을 수 없습니다.');
                }

                // 우측 패널의 데이터 수집
                const tableRows = rightContent.querySelectorAll('tbody tr');
                const sourcingData = {
                    cleanName,
                    data: Array.from(tableRows).map(row => {
                        const brandName = row.querySelector('td:nth-child(2)').textContent.trim();
                        const itemName = row.querySelector('.editable-item').textContent.trim();
                        const websiteUrl = row.querySelector('td:nth-child(4) a')?.href || '-';

                        return {
                            "1.브랜드": brandName,
                            "2.아이템": itemName,
                            "3.링크": websiteUrl
                        };
                    })
                };

                // 데이터가 없는 경우 체크
                if (sourcingData.data.length === 0) {
                    throw new Error('업로드할 데이터가 없습니다.');
                }

                // preload를 통해 main process에 요청
                const result = await window.notionAPI.uploadToNotion(sourcingData);
                
                if (result && result.success) {
                    // 성공 토스트 메시지
                    toast.className = 'toast-message success';
                    toast.innerHTML = `
                        <span class="toast-icon">✓</span>
                        <span class="toast-text">${result.message}</span>
                    `;

                    // 페이지 URL이 있는 경우 모달 표시
                    if (result.pageUrl) {
                        console.log('노션 페이지 URL:', result.pageUrl);
                        showNotionPageModal(result.pageUrl);
                    } else {
                        // URL이 없는 경우 경고 메시지 표시
                        console.warn('페이지 URL이 없습니다:', result);
                        const warningToast = document.createElement('div');
                        warningToast.className = 'toast-message warning';
                        warningToast.innerHTML = `
                            <span class="toast-icon">⚠</span>
                            <span class="toast-text">페이지가 생성되었으나 공유 링크를 가져오지 못했습니다.</span>
                        `;
                        document.body.appendChild(warningToast);
                        setTimeout(() => {
                            warningToast.classList.add('fade-out');
                            setTimeout(() => warningToast.remove(), 300);
                        }, 5000);
                    }
                } else {
                    throw new Error(result?.message || '알 수 없는 오류가 발생했습니다.');
                }
            } catch (err) {
                console.error('노션 업로드 실패:', err);
                toast.className = 'toast-message error';
                toast.innerHTML = `
                    <span class="toast-icon">✕</span>
                    <span class="toast-text">노션 업로드 실패: ${err.message}</span>
                `;
            } finally {
                // 버튼 다시 활성화
                notionBtn.disabled = false;
                notionBtn.style.opacity = '1';
                notionBtn.style.cursor = 'pointer';

                // 토스트 메시지 제거 (5초 후)
                setTimeout(() => {
                    toast.classList.add('fade-out');
                    setTimeout(() => toast.remove(), 300);
                }, 5000);
            }
        });
    }
}

// 노션 페이지 모달을 표시하는 함수
function showNotionPageModal(pageUrl) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background-color: white;
        padding: 1.5rem;
        border-radius: 0.5rem;
        width: 90%;
        max-width: 500px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    `;

    modalContent.innerHTML = `
        <div style="margin-bottom: 1rem;">
            <h3 style="font-size: 1.25rem; font-weight: 600; color: #111827; margin-bottom: 0.5rem;">노션 페이지가 생성되었습니다</h3>
            <p style="color: #6b7280; font-size: 0.875rem;">아래 링크를 클릭하여 노션 페이지로 이동할 수 있습니다.</p>
        </div>
        <div style="margin-bottom: 1.5rem;">
            <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                <a href="${pageUrl}" 
                   target="_blank" 
                   style="flex: 1;
                          padding: 0.75rem;
                          background-color: #f3f4f6;
                          border-radius: 0.375rem;
                          color: #2563eb;
                          text-decoration: none;
                          font-size: 0.875rem;
                          word-break: break-all;
                          transition: background-color 0.2s;"
                   onmouseover="this.style.backgroundColor='#e5e7eb'"
                   onmouseout="this.style.backgroundColor='#f3f4f6'">
                    ${pageUrl}
                </a>
                <button id="copy-link-btn"
                        style="display: inline-flex;
                               align-items: center;
                               gap: 0.5rem;
                               padding: 0.75rem;
                               background-color: #2563eb;
                               color: white;
                               border: none;
                               border-radius: 0.375rem;
                               font-size: 0.875rem;
                               font-weight: 500;
                               cursor: pointer;
                               transition: background-color 0.2s;
                               white-space: nowrap;"
                        onmouseover="this.style.backgroundColor='#1d4ed8'"
                        onmouseout="this.style.backgroundColor='#2563eb'">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    복사
                </button>
            </div>
            <div id="copy-toast" 
                 style="display: none;
                        padding: 0.5rem;
                        background-color: #10b981;
                        color: white;
                        border-radius: 0.375rem;
                        font-size: 0.875rem;
                        text-align: center;
                        transition: opacity 0.3s;">
                링크가 클립보드에 복사되었습니다
            </div>
        </div>
        <div style="display: flex; justify-content: flex-end;">
            <button id="close-modal-btn"
                    style="padding: 0.5rem 1rem;
                           background-color: #f3f4f6;
                           color: #374151;
                           border: none;
                           border-radius: 0.375rem;
                           font-size: 0.875rem;
                           font-weight: 500;
                           cursor: pointer;
                           transition: background-color 0.2s;"
                    onmouseover="this.style.backgroundColor='#e5e7eb'"
                    onmouseout="this.style.backgroundColor='#f3f4f6'">
                닫기
            </button>
        </div>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // 링크 복사 버튼 이벤트 리스너
    const copyBtn = modalContent.querySelector('#copy-link-btn');
    const copyToast = modalContent.querySelector('#copy-toast');
    
    copyBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(pageUrl);
            copyToast.style.display = 'block';
            setTimeout(() => {
                copyToast.style.opacity = '0';
                setTimeout(() => {
                    copyToast.style.display = 'none';
                    copyToast.style.opacity = '1';
                }, 300);
            }, 2000);
        } catch (err) {
            console.error('클립보드 복사 실패:', err);
            // 복사 실패 시 대체 방법 사용
            const textArea = document.createElement('textarea');
            textArea.value = pageUrl;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                copyToast.style.display = 'block';
                setTimeout(() => {
                    copyToast.style.opacity = '0';
                    setTimeout(() => {
                        copyToast.style.display = 'none';
                        copyToast.style.opacity = '1';
                    }, 300);
                }, 2000);
            } catch (err) {
                console.error('대체 복사 방법도 실패:', err);
            }
            document.body.removeChild(textArea);
        }
    });

    // 모달 닫기 버튼 이벤트 리스너
    const closeBtn = modalContent.querySelector('#close-modal-btn');
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });

    // 모달 외부 클릭 시 닫기
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // ESC 키로 모달 닫기
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            modal.remove();
        }
    });
} 