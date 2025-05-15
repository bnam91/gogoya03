export class BrandHistoryFilter {
    constructor() {
        this.container = null;
        this.searchInput = null;
        this.onFilterChange = null;
    }

    init() {
        if (!this.container) return;

        // 검색 필터 HTML 추가
        const filterHTML = `
            <div class="brand-history-filter">
                <div class="filter-group">
                    <input type="text" 
                           id="brand-history-search" 
                           placeholder="브랜드명 또는 아이템명으로 검색"
                           class="brand-search-input">
                </div>
            </div>
        `;

        // 필터를 패널 상단에 추가
        const panelContent = this.container.querySelector('.right-panel-content');
        if (panelContent) {
            panelContent.insertAdjacentHTML('beforebegin', filterHTML);
        }

        // 검색 입력 이벤트 리스너 추가
        this.searchInput = this.container.querySelector('#brand-history-search');
        if (this.searchInput) {
            this.searchInput.addEventListener('input', this.handleSearch.bind(this));
        }
    }

    handleSearch(event) {
        const searchTerm = event.target.value.toLowerCase().trim();
        const brandItems = this.container.querySelectorAll('.product-item');
        
        brandItems.forEach(item => {
            const brandName = item.querySelector('.product-brand')?.textContent.toLowerCase() || '';
            const itemTitle = item.querySelector('.product-title')?.textContent.toLowerCase() || '';
            const itemCategory = item.querySelector('.product-category')?.textContent.toLowerCase() || '';
            
            const isVisible = !searchTerm || 
                            brandName.includes(searchTerm) || 
                            itemTitle.includes(searchTerm) ||
                            itemCategory.includes(searchTerm);

            item.style.display = isVisible ? 'block' : 'none';
        });

        // 검색 결과가 없을 때 메시지 표시
        const visibleItems = Array.from(brandItems).filter(item => item.style.display !== 'none');
        const noResultsMsg = this.container.querySelector('.no-search-results');
        
        if (visibleItems.length === 0 && searchTerm) {
            if (!noResultsMsg) {
                const msg = document.createElement('div');
                msg.className = 'no-search-results';
                msg.textContent = '검색 결과가 없습니다.';
                this.container.querySelector('.right-panel-content').appendChild(msg);
            }
        } else if (noResultsMsg) {
            noResultsMsg.remove();
        }
    }

    setContainer(container) {
        this.container = container;
        this.init();
    }
} 