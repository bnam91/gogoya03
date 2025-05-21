/**
 * brand-match.js
 * @fileoverview 브랜드 매칭 탭 초기화
 */

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
            <div class="search-container" style="padding: 1rem;">
                <div class="input-group" style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
                    <input 
                        type="text" 
                        id="username-input" 
                        class="form-input" 
                        placeholder="인플루언서 사용자명 또는 정제명 입력"
                        style="flex: 1; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;"
                    >
                    <button id="search-influencer-btn" class="btn btn-primary">조회</button>
                </div>
            </div>
            <div id="influencer-list" class="list-container">
                <div class="list-item influencer-detail">
                    <div class="list-header">
                        <span>인플루언서 정보</span>
                    </div>
                </div>
            </div>
        `;

        // 조회 버튼 이벤트 리스너 추가
        const searchBtn = leftContent.querySelector('#search-influencer-btn');
        const usernameInput = leftContent.querySelector('#username-input');

        searchBtn.addEventListener('click', async () => {
            const username = usernameInput.value.trim();
            
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
                console.log("전체 인플루언서 데이터:", data); // 전체 데이터 로깅
                console.log("데이터 타입:", typeof data); // 데이터 타입 확인
                console.log("데이터 길이:", data.length); // 데이터 개수 확인

                // 입력한 username과 일치하는 데이터 찾기
                const matchedData = data.find(item => {
                    console.log("비교:", item.username, item.clean_name, username); // 각 항목 비교 로깅
                    return item.username === username || item.clean_name === username;
                });
                console.log("매칭된 데이터 상세:", JSON.stringify(matchedData, null, 2)); // 매칭된 데이터 상세 로깅

                const listContainer = leftContent.querySelector('#influencer-list');
                
                // 기존 리스트 아이템 제거 (헤더 제외)
                const existingItems = listContainer.querySelectorAll('.list-item:not(.list-header)');
                existingItems.forEach(item => item.remove());

                // 데이터 표시
                if (matchedData) {
                    // 이미지 URL 처리
                    const imageUrl = matchedData.image_url;
                    console.log("이미지 URL:", imageUrl); // 디버깅용 로그

                    const listItem = document.createElement('div');
                    listItem.className = 'list-item influencer-detail';
                    listItem.innerHTML = `
                        <div class="detail-section">
                            <div class="profile-image">
                                ${matchedData.image_url ? `
                                    <a href="${matchedData.profile_link}" target="_blank" style="display: block; cursor: pointer;">
                                        <img src="${matchedData.image_url}" 
                                            alt="${matchedData.username}" 
                                            onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE1MCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiNFNUU3RUIiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzY2NiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjAiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='">
                                    </a>
                                ` : `
                                    <a href="${matchedData.profile_link}" target="_blank" style="display: block; cursor: pointer;">
                                        <div class="no-image">No Image</div>
                                    </a>
                                `}
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">사용자명:</span>
                                <span class="detail-value">${matchedData.username || '-'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">정제명:</span>
                                <span class="detail-value">${matchedData.clean_name || '-'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">소개:</span>
                                <span class="detail-value">${matchedData.bio || '-'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">카테고리:</span>
                                <span class="detail-value">${matchedData.category || '-'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">팔로워:</span>
                                <span class="detail-value">${matchedData.followers ? Number(matchedData.followers).toLocaleString() : '-'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">팔로잉:</span>
                                <span class="detail-value">${matchedData.following ? Number(matchedData.following).toLocaleString() : '-'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">게시물:</span>
                                <span class="detail-value">${matchedData.posts ? Number(matchedData.posts).toLocaleString() : '-'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">외부 링크:</span>
                                <a href="${matchedData.out_link}" target="_blank" class="detail-link">${matchedData.out_link || '-'}</a>
                            </div>
                        </div>
                    `;
                    listContainer.appendChild(listItem);

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
                        <span class="toast-icon">⚠</span>
                        <span class="toast-text">해당 사용자를 찾을 수 없습니다.</span>
                    `;
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
                // 3초 후 토스트 메시지 제거
                setTimeout(() => {
                    const toast = document.querySelector('.toast-message');
                    if (toast) {
                        toast.classList.add('fade-out');
                        setTimeout(() => toast.remove(), 300);
                    }
                }, 3000);
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
        centerContent.innerHTML = '';
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