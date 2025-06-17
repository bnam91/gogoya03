/**
 * keyword-search.js
 * @fileoverview 키워드 검색 탭 초기화
 */

export function initPage() {
    console.log('키워드 검색 페이지가 초기화되었습니다.');
    
    // 브레드크럼 업데이트
    const breadcrumbMain = document.getElementById('breadcrumb-main');
    const breadcrumbCurrent = document.getElementById('breadcrumb-current');
    
    if (breadcrumbMain && breadcrumbCurrent) {
        breadcrumbMain.textContent = '벤더';
        breadcrumbCurrent.textContent = '키워드 검색';
    }

    // 키워드 검색 이벤트 리스너 추가
    const keywordSearchBtn = document.getElementById('keyword-search-btn');
    const keywordSearchInput = document.getElementById('keyword-search-input');
    const keywordSearchResults = document.getElementById('keyword-search-results');
    const centerPanel = document.querySelector('.center-panel .card-container');

    // 키워드 하이라이트 함수
    function highlightKeyword(text, keyword) {
        if (!text || !keyword) {
            return text;
        }
        
        const startIdx = text.toLowerCase().indexOf(keyword.toLowerCase());
        if (startIdx === -1) {
            return text;
        }
        
        const contextStart = Math.max(0, startIdx - 50);
        const contextEnd = Math.min(text.length, startIdx + keyword.length + 50);
        
        let context = text.slice(contextStart, contextEnd);
        
        const highlighted = context.replace(
            text.slice(startIdx, startIdx + keyword.length),
            `<span style="background-color: #FFEB3B; padding: 0 2px; border-radius: 2px;">${text.slice(startIdx, startIdx + keyword.length)}</span>`
        );
        
        let result = highlighted;
        if (contextStart > 0) {
            result = "..." + result;
        }
        if (contextEnd < text.length) {
            result = result + "...";
        }
        
        return result;
    }

    // 검색 버튼 클릭 이벤트
    keywordSearchBtn.addEventListener('click', async () => {
        const keyword = document.getElementById('keyword-search-input').value.trim();
        if (!keyword) return;

        try {
            const results = await window.api.searchContentByKeyword(keyword);
            console.log('검색 결과:', results);

            if (!results || results.length === 0) {
                keywordSearchResults.innerHTML = '<div class="no-results">검색 결과가 없습니다.</div>';
                return;
            }

            // 작성자별로 그룹화
            const authorGroups = results.reduce((groups, post) => {
                const author = post.author || '정보 없음';
                if (!groups[author]) {
                    groups[author] = [];
                }
                groups[author].push(post);
                return groups;
            }, {});

            // 각 작성자의 최신 게시물 날짜 찾기
            const authorList = Object.entries(authorGroups).map(([author, posts]) => {
                const latestPost = posts.reduce((latest, post) => {
                    const postDate = new Date(post.cr_at);
                    return postDate > latest.date ? { date: postDate, post } : latest;
                }, { date: new Date(0), post: null });

                return {
                    author,
                    postCount: posts.length,
                    latestPost: latestPost.post
                };
            });

            // 최신 게시물 날짜순으로 정렬
            authorList.sort((a, b) => new Date(b.latestPost.cr_at) - new Date(a.latestPost.cr_at));

            // HTML 생성
            const html = await Promise.all(authorList.map(async (item) => {
                // 인플루언서 정보 가져오기
                const influencerInfo = await window.api.getInfluencerInfo(item.author);
                
                return `
                    <div class="author-item" data-author="${item.author}">
                        <div class="author-header">
                            <span class="author-name">${item.author}</span>
                            <span class="post-count">${item.postCount}개</span>
                        </div>
                        ${influencerInfo ? `
                            <div class="influencer-info">
                                <span class="influencer-name">${influencerInfo.clean_name}</span>
                                <span class="badge">팔로워 ${influencerInfo.followers}</span>
                                <span class="badge">릴스 ${influencerInfo["reels_views(15)"]?.toLocaleString() || '0'}</span>
                            </div>
                        ` : ''}
                        <div class="latest-post-date">
                            최신 게시물: ${new Date(item.latestPost.cr_at).toLocaleDateString('ko-KR')}
                        </div>
                    </div>
                `;
            }));

            keywordSearchResults.innerHTML = html.join('');

            // 작성자 클릭 이벤트 리스너
            document.querySelectorAll('.author-item').forEach(item => {
                item.addEventListener('click', () => {
                    // 이전 선택 제거
                    document.querySelectorAll('.author-item').forEach(i => i.classList.remove('selected'));
                    // 현재 항목 선택
                    item.classList.add('selected');
                    
                    const author = item.dataset.author;
                    const authorPosts = authorGroups[author];
                    
                    // 중앙 패널에 게시물 표시
                    const centerPanel = document.querySelector('.center-panel .card-container');
                    centerPanel.innerHTML = authorPosts.map(post => `
                        <div class="post-item">
                            <div class="post-content">${highlightKeyword(post.content || '내용 없음', keyword)}</div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
                                <div class="post-date">${new Date(post.cr_at).toLocaleDateString('ko-KR')}</div>
                                <a href="${post.post_url}" target="_blank" style="color: #2563eb; text-decoration: none;">
                                    게시물 바로가기
                                    <svg style="display: inline; margin-left: 4px;" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                        <polyline points="15 3 21 3 21 9"></polyline>
                                        <line x1="10" y1="14" x2="21" y2="3"></line>
                                    </svg>
                                </a>
                            </div>
                        </div>
                    `).join('');
                });
            });

        } catch (error) {
            console.error('검색 중 오류 발생:', error);
            keywordSearchResults.innerHTML = '<div class="error">검색 중 오류가 발생했습니다.</div>';
        }
    });

    // Enter 키로 검색 가능하도록 설정
    keywordSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            keywordSearchBtn.click();
        }
    });
} 