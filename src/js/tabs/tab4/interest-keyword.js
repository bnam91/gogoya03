/**
 * 관심키워드 페이지 관리를 위한 JavaScript 모듈
 */
export function initPage() {
    console.log('관심키워드 페이지 초기화');
    initEventListeners();
}

function initEventListeners() {
    const searchInput = document.getElementById('interest-keyword-search-input');
    const searchButton = document.getElementById('interest-keyword-search-button');
    const searchResults = document.getElementById('interest-keyword-search-results');
    const loadingIndicator = document.getElementById('interest-keyword-loading');

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

            // TODO: 실제 검색 기능 구현
            console.log('검색어:', searchQuery);

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
} 