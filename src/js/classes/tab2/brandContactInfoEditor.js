export class BrandContactInfoEditor {
    constructor() {
        this.currentBrandData = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('dblclick', (e) => {
            const target = e.target;
            if (target.classList.contains('editable')) {
                this.startEditing(target);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.classList.contains('edit-input')) {
                this.saveEdit(e.target);
            } else if (e.key === 'Escape' && e.target.classList.contains('edit-input')) {
                this.cancelEdit(e.target);
            }
        });
    }

    startEditing(element) {
        const currentValue = element.textContent.trim();
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'edit-input';
        input.value = currentValue;
        
        // 입력 필드의 크기를 텍스트 크기에 맞게 조정
        input.style.width = `${element.offsetWidth}px`;
        
        element.textContent = '';
        element.appendChild(input);
        input.focus();
    }

    async saveEdit(input) {
        const newValue = input.value.trim();
        const parentSpan = input.parentElement;
        const fieldName = parentSpan.dataset.field;
        
        if (newValue !== parentSpan.textContent.trim()) {
            try {
                // MongoDB 업데이트
                //await mongo.updateBrandInfo(this.currentBrandData.brand_name, {
                //    [fieldName]: newValue
                //});
                await window.api.updateBrandInfo(this.currentBrandData.brand_name, {
                    [fieldName]: newValue
                });
                
                // UI 업데이트
                parentSpan.textContent = newValue;
                parentSpan.classList.add('edited');
                
                // 성공 메시지 표시
                this.showToast('정보가 성공적으로 업데이트되었습니다.');
            } catch (error) {
                console.error('정보 업데이트 중 오류:', error);
                this.showToast('정보 업데이트 중 오류가 발생했습니다.');
            }
        } else {
            parentSpan.textContent = newValue;
        }
    }

    cancelEdit(input) {
        const parentSpan = input.parentElement;
        parentSpan.textContent = parentSpan.dataset.originalValue || '';
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast-message success';
        toast.innerHTML = `
            <span class="toast-icon">✓</span>
            <span class="toast-text">${message}</span>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    setCurrentBrandData(brandData) {
        this.currentBrandData = brandData;
    }
}

// 전역 인스턴스 생성
//const brandContactInfoEditor = new BrandContactInfoEditor();

//module.exports = BrandContactInfoEditor;  // 클래스 자체를 내보냄 