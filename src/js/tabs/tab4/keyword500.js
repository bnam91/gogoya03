/**
 * 키워드500 페이지 관리를 위한 JavaScript 모듈
 */
import { categoryMap } from '../../data/categoryMap.js';

export function initPage() {
    console.log('키워드500 페이지 초기화');
    initCategorySelectors();
    initEventListeners();
    initKeyboardNavigation();
}

let currentCategory = null;
let currentKeywords = null;
let selectedKeywordIndex = -1;
let isAscending = true; // 정렬 방향 상태 추가
let currentCategoryId = null; // 현재 선택된 카테고리 ID 저장

function initCategorySelectors() {
    console.log('카테고리 선택기 초기화 시작');
    const firstCategorySelect = document.getElementById('keyword500-first-category');
    const secondCategorySelect = document.getElementById('keyword500-second-category');

    if (!firstCategorySelect || !secondCategorySelect) {
        console.error('카테고리 선택 요소를 찾을 수 없습니다.');
        return;
    }

    // 필터링할 카테고리 목록
    const filteredCategories = ['출산/육아', '여가/생활편의', '면세점', '도서'];

    console.log('categoryMap 데이터:', categoryMap);
    console.log('1차 카테고리 목록:', Object.keys(categoryMap));

    // 1차 카테고리 옵션 추가 (필터링 적용)
    Object.keys(categoryMap)
        .filter(category => !filteredCategories.includes(category))
        .forEach(category => {
            console.log('1차 카테고리 추가:', category);
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            firstCategorySelect.appendChild(option);
        });

    // 1차 카테고리 변경 이벤트
    firstCategorySelect.addEventListener('change', () => {
        const selectedFirstCategory = firstCategorySelect.value;
        console.log('선택된 1차 카테고리:', selectedFirstCategory);
        
        // 2차 카테고리 초기화
        secondCategorySelect.innerHTML = '<option value="">2차 카테고리 선택</option>';
        secondCategorySelect.disabled = !selectedFirstCategory;

        if (selectedFirstCategory) {
            console.log('2차 카테고리 목록:', categoryMap[selectedFirstCategory]);
            // 선택된 1차 카테고리에 해당하는 2차 카테고리 옵션 추가
            categoryMap[selectedFirstCategory].forEach(subCategory => {
                console.log('2차 카테고리 추가:', subCategory.name);
                const option = document.createElement('option');
                option.value = `${selectedFirstCategory}_${subCategory.name}`;
                option.textContent = subCategory.name;
                secondCategorySelect.appendChild(option);
            });
        }
    });

    console.log('카테고리 선택기 초기화 완료');
}

function initEventListeners() {
    const searchButton = document.getElementById('keyword500-search-button');
    const keywordListElement = document.getElementById('keyword500-keyword-list');

    // 조회 버튼 클릭 이벤트
    searchButton.addEventListener('click', async () => {
        const secondCategory = document.getElementById('keyword500-second-category');
        const selectedCategory = secondCategory.value;

        if (!selectedCategory) {
            alert('카테고리를 선택해주세요.');
            return;
        }

        try {
            await loadKeywordList(selectedCategory);
            // 키워드 목록 로드 후 선택 초기화
            selectedKeywordIndex = -1;
            updateSelectedKeyword();
        } catch (error) {
            console.error('키워드 조회 중 오류 발생:', error);
            alert(error.message || '키워드 조회 중 오류가 발생했습니다.');
        }
    });

    // 키워드 아이템 클릭 이벤트
    if (keywordListElement) {
        keywordListElement.addEventListener('click', (event) => {
            const keywordItem = event.target.closest('.keyword-item');
            if (keywordItem) {
                const items = keywordListElement.querySelectorAll('.keyword-item');
                selectedKeywordIndex = Array.from(items).indexOf(keywordItem);
                updateSelectedKeyword();
            }
        });
    }
}

function initKeyboardNavigation() {
    document.addEventListener('keydown', (event) => {
        const keywordListElement = document.getElementById('keyword500-keyword-list');
        if (!keywordListElement || !currentKeywords) return;

        const items = keywordListElement.querySelectorAll('.keyword-item');
        if (items.length === 0) return;

        switch (event.key.toLowerCase()) {
            case 'arrowup':
                event.preventDefault();
                if (selectedKeywordIndex > 0) {
                    selectedKeywordIndex--;
                    updateSelectedKeyword();
                    scrollToSelectedItem(items[selectedKeywordIndex]);
                }
                break;
            case 'arrowdown':
                event.preventDefault();
                if (selectedKeywordIndex < items.length - 1) {
                    selectedKeywordIndex++;
                    updateSelectedKeyword();
                    scrollToSelectedItem(items[selectedKeywordIndex]);
                }
                break;
            case 'p':
                event.preventDefault();
                if (selectedKeywordIndex >= 0) {
                    const selectedItem = items[selectedKeywordIndex];
                    const checkbox = selectedItem.querySelector('.keyword-checkbox');
                    if (checkbox) {
                        checkbox.checked = !checkbox.checked;
                        // 체크박스 change 이벤트 수동 트리거
                        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
                break;
        }
    });
}

function updateSelectedKeyword() {
    const keywordListElement = document.getElementById('keyword500-keyword-list');
    if (!keywordListElement) return;

    const items = keywordListElement.querySelectorAll('.keyword-item');
    items.forEach((item, index) => {
        if (index === selectedKeywordIndex) {
            item.classList.add('selected');
            item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else {
            item.classList.remove('selected');
        }
    });
}

function scrollToSelectedItem(item) {
    if (!item) return;
    
    const container = document.getElementById('keyword500-keyword-list');
    const containerRect = container.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();

    if (itemRect.top < containerRect.top) {
        container.scrollTop -= (containerRect.top - itemRect.top);
    } else if (itemRect.bottom > containerRect.bottom) {
        container.scrollTop += (itemRect.bottom - containerRect.bottom);
    }
}

async function loadKeywordList(categoryId) {
    try {
        console.log('키워드 목록 로드 시작:', categoryId);
        currentCategoryId = categoryId; // 현재 카테고리 ID 저장
        const data = await window.api.getKeyword500Keywords(categoryId);
        console.log('로드된 키워드 데이터:', data);

        const categoryPathElement = document.getElementById('keyword500-category-path');
        const dateElement = document.getElementById('keyword500-date');
        const keywordListElement = document.getElementById('keyword500-keyword-list');

        if (!categoryPathElement || !dateElement || !keywordListElement) {
            throw new Error('필요한 DOM 요소를 찾을 수 없습니다.');
        }

        // 카테고리 경로 표시
        categoryPathElement.textContent = `${data.category.first} > ${data.category.second}`;

        // 날짜 표시
        dateElement.textContent = `최근 업데이트: ${new Date(data.date).toLocaleDateString()}`;

        // 키워드 목록 표시
        if (!data.keywords || !Array.isArray(data.keywords)) {
            throw new Error('유효하지 않은 키워드 데이터 형식입니다.');
        }

        // 현재 키워드 데이터 저장
        currentKeywords = data.keywords;
        selectedKeywordIndex = -1; // 선택 초기화

        keywordListElement.innerHTML = '';
        
        // 헤더 추가
        const header = document.createElement('div');
        header.className = 'keyword-list-header';
        header.innerHTML = `
            <div class="checkbox-header"></div>
            <div class="rank-header" id="rank-sort-header">순위</div>
            <div class="keyword-header">키워드</div>
        `;
        keywordListElement.appendChild(header);

        // 정렬 헤더 클릭 이벤트
        const rankHeader = document.getElementById('rank-sort-header');
        rankHeader.addEventListener('click', () => {
            isAscending = !isAscending;
            renderKeywordList(data.keywords);
        });

        renderKeywordList(data.keywords);
        console.log('키워드 목록 표시 완료');
    } catch (error) {
        console.error('키워드 목록 로드 중 오류:', error);
        
        // UI 초기화
        const categoryPathElement = document.getElementById('keyword500-category-path');
        const dateElement = document.getElementById('keyword500-date');
        const keywordListElement = document.getElementById('keyword500-keyword-list');
        
        if (categoryPathElement) categoryPathElement.textContent = '';
        if (dateElement) dateElement.textContent = '';
        if (keywordListElement) keywordListElement.innerHTML = '';
        
        // 에러 메시지 표시
        if (keywordListElement) {
            keywordListElement.innerHTML = `
                <div class="error-message">
                    키워드 목록을 불러오는 중 오류가 발생했습니다: ${error.message}
                </div>
            `;
        }

        // 현재 키워드 데이터 초기화
        currentKeywords = null;
        selectedKeywordIndex = -1;
    }
}

function renderKeywordList(keywords) {
    const keywordListElement = document.getElementById('keyword500-keyword-list');
    if (!keywordListElement) return;

    // 헤더는 유지하고 나머지 내용만 제거
    const header = keywordListElement.querySelector('.keyword-list-header');
    keywordListElement.innerHTML = '';
    if (header) keywordListElement.appendChild(header);

    // 정렬된 키워드 목록 생성
    const sortedKeywords = [...keywords].sort((a, b) => {
        return isAscending ? a.rank - b.rank : b.rank - a.rank;
    });

    // 정렬 방향에 따른 헤더 텍스트 업데이트
    const rankHeader = document.getElementById('rank-sort-header');
    if (rankHeader) {
        rankHeader.textContent = `순위 ${isAscending ? '↑' : '↓'}`;
    }

    sortedKeywords.forEach((item, index) => {
        const keywordItem = document.createElement('div');
        keywordItem.className = 'keyword-item';
        if (item.status === 'pick') {
            keywordItem.classList.add('picked');
        }
        keywordItem.setAttribute('tabindex', '0');
        
        // 체크박스 추가
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'keyword-checkbox';
        checkbox.checked = item.status === 'pick';
        checkbox.addEventListener('change', async (event) => {
            event.stopPropagation(); // 클릭 이벤트 전파 방지
            try {
                const status = event.target.checked ? 'pick' : 'none';
                await window.api.updateKeyword500Status({
                    categoryId: currentCategoryId,
                    keyword: item.keyword,
                    status: status
                });
                // 로컬 데이터 업데이트
                item.status = status;
                // picked 클래스 토글
                keywordItem.classList.toggle('picked', status === 'pick');
            } catch (error) {
                console.error('키워드 상태 업데이트 실패:', error);
                event.target.checked = !event.target.checked; // 체크박스 상태 되돌리기
                keywordItem.classList.toggle('picked', !event.target.checked); // 클래스 상태도 되돌리기
                alert('키워드 상태 업데이트에 실패했습니다.');
            }
        });
        
        const rankSpan = document.createElement('span');
        rankSpan.className = 'keyword-rank';
        rankSpan.textContent = `${item.rank}위`;
        
        const keywordSpan = document.createElement('span');
        keywordSpan.className = 'keyword-text';
        keywordSpan.textContent = item.keyword;
        
        keywordItem.appendChild(checkbox);
        keywordItem.appendChild(rankSpan);
        keywordItem.appendChild(keywordSpan);
        keywordListElement.appendChild(keywordItem);
    });

    // 선택 상태 업데이트
    updateSelectedKeyword();
} 