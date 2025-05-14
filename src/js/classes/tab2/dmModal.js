export class DmModal {
    constructor() {
        this.modal = null;
        this.brandInput = null;
        this.itemInput = null;
        this.loading = false;
        this.init();
    }

    init() {
        // 모달 HTML 생성
        const modalHTML = `
            <div id="dm-modal" class="modal">
                <div class="modal-content">
                    <h3>컨택하기</h3>
                    <div class="modal-buttons">
                        <div class="sheet-buttons-row">
                            <button class="modal-button sheet-button">
                                <i class="fas fa-users"></i> DM 인원시트
                            </button>
                            <button class="modal-button template-button">
                                <i class="fas fa-file-alt"></i> DM 템플릿
                            </button>
                        </div>
                    </div>
                    <div class="modal-input-group">
                        <label for="brand-input">브랜드</label>
                        <input type="text" id="brand-input" placeholder="브랜드명을 입력하세요">
                    </div>
                    <div class="modal-input-group">
                        <label for="item-input">아이템</label>
                        <input type="text" id="item-input" placeholder="아이템명을 입력하세요">
                    </div>
                    <div class="modal-footer">
                        <button class="modal-button upload-button">인원 업로드 하기</button>
                        <button class="modal-button cancel">취소</button>
                    </div>
                </div>
            </div>
        `;

        // 모달을 body에 추가
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // 모달 요소 참조
        this.modal = document.getElementById('dm-modal');
        this.brandInput = document.getElementById('brand-input');
        this.itemInput = document.getElementById('item-input');

        // 인원 업로드 이벤트
        this.uploadButton = document.querySelector('.upload-button');
        this.uploadButton.addEventListener('click', () => this.upload());

        // 취소 버튼 이벤트
        this.cancelButton = document.querySelector('.cancel');
        this.cancelButton.addEventListener('click', () => this.close());

        // 시트 버튼 이벤트
        this.sheetButton = document.querySelector('.sheet-button');
        this.sheetButton.addEventListener('click', () => this.openDmSheet());   

        // 템플릿 버튼 이벤트
        this.templateButton = document.querySelector('.template-button');
        this.templateButton.addEventListener('click', () => this.openTemplateSheet());
    }

    updateLoadingState() {
        if (this.loading) {
            this.uploadButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 업로드 중...';
            this.uploadButton.disabled = true;
            this.cancelButton.disabled = false;
        } else {
            this.uploadButton.innerHTML = '인원 업로드 하기';
            this.uploadButton.disabled = false;
            this.cancelButton.disabled = false;
        }
    }

    async upload() {
        const originalText = this.uploadButton.innerHTML;
        try {
            this.loading = true;
            this.updateLoadingState();

            // 브랜드와 아이템 정보 확인
            const brand = this.getBrand();
            const item = this.getItem();

            if (!brand || !item) {
                throw new Error('브랜드와 아이템 정보가 필요합니다.');
            }

            // 선택된 인플루언서 정보 추출
            const rows = document.querySelectorAll('#seller-match-center-content .influencer-table tbody tr');
            
            if (!rows || rows.length === 0) {
                throw new Error('인플루언서가 없습니다.');
            }
            
            // 각 행에서 인플루언서 정보 추출
            const influencerData = Array.from(rows).map(row => {
                const cleanName = row.dataset.cleanName;
                const influencerId = row.dataset.influencerId;
                
                const lastUnderscoreIndex = influencerId.lastIndexOf('_');
                const username = lastUnderscoreIndex !== -1 ? 
                    influencerId.substring(0, lastUnderscoreIndex) : influencerId;
                
                console.log(`추출된 정보 - influencerId: ${influencerId}, username: ${username}, cleanName: ${cleanName}`);
                
                const nameCols = row.querySelectorAll('.name-username');
                const nameText = nameCols.length > 0 ? nameCols[0].textContent : '';
                
                const categoryCols = row.querySelectorAll('.category');
                const categoryText = categoryCols.length > 0 ? 
                    categoryCols[0].textContent.replace(/\(\d+%\)/g, '').trim() : '';
                
                const reelsViewsCols = row.querySelectorAll('.reels-views');
                const reelsViewsText = reelsViewsCols.length > 0 ? reelsViewsCols[0].textContent : '0';
                
                const contactMethodCols = row.querySelectorAll('.contact-method');
                const contactMethodText = contactMethodCols.length > 0 ? contactMethodCols[0].textContent : '';
                
                return {
                    name: cleanName,
                    username: username,
                    fullNameUsername: nameText,
                    category: categoryText,
                    reelsViews: reelsViewsText,
                    contactMethod: contactMethodText
                };
            });

            console.log('업로드할 인플루언서 데이터:', influencerData);

            try {
                await window.googleSheetApi.uploadInfluencerData({
                    brand,
                    item,
                    selectedInfluencers: influencerData
                });
                
                alert('업로드가 완료되었습니다.');
                this.close();
            } catch (error) {
                console.error('업로드 실패:', error);
                
                // 인증 관련 에러 처리
                if (error.message.includes('인증이 필요합니다') || error.message.includes('invalid_grant')) {
                    alert('Google 계정 인증이 필요합니다. 다시 시도해주세요.');
                } else {
                    alert('업로드 중 오류가 발생했습니다: ' + error.message);
                }
            }
        } catch (error) {
            console.error('업로드 실패:', error);
            alert(error.message);
        } finally {
            this.loading = false;
            this.updateLoadingState();
            // 버튼 상태 복원
            this.uploadButton.innerHTML = originalText;
            this.uploadButton.disabled = false;
            this.cancelButton.disabled = false;
        }
    }

    getBrand() {
        return this.brandInput.value.trim();
    }

    getItem() {
        return this.itemInput.value.trim();
    }

    open() {
        this.modal.style.display = 'block';
    }
    
    close() {
        this.modal.style.display = 'none';
        this.brandInput.value = '';
        this.itemInput.value = '';
        this.loading = false;
        this.updateLoadingState();
    }

    openDmSheet() {
        window.open('https://docs.google.com/spreadsheets/d/1VhEWeQASyv02knIghpcccYLgWfJCe2ylUnPsQ_-KNAI/edit?gid=1878271662#gid=1878271662', '_blank');
    }

    openTemplateSheet() {
        window.open('https://docs.google.com/spreadsheets/d/1mwZ37jiEGK7rQnLWp87yUQZHyM6LHb4q6mbB0A07fI0/edit?gid=1722323555#gid=1722323555', '_blank');
    }
}

// 전역 인스턴스 생성
//window.dmModal = new DmModal(); 