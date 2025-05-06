export class DmModal {
    constructor() {
        this.modal = null;
        this.brandInput = null;
        this.itemInput = null;
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
        this.uploadButton.addEventListener('click', this.upload);

        // 취소 버튼 이벤트
        this.cancelButton = document.querySelector('.cancel');
        this.cancelButton.addEventListener('click', this.close);

        // 시트 버튼 이벤트
        this.sheetButton = document.querySelector('.sheet-button');
        this.sheetButton.addEventListener('click', this.openDmSheet);   

        // 템플릿 버튼 이벤트
        this.templateButton = document.querySelector('.template-button');
        this.templateButton.addEventListener('click', this.openTemplateSheet);
    }

    open = () => {
        this.modal.style.display = 'block';
    }
    
    close = () => {
        this.modal.style.display = 'none';
        this.brandInput.value = '';
        this.itemInput.value = '';
    }

    openDmSheet = () => {
        window.open('https://docs.google.com/spreadsheets/d/1VhEWeQASyv02knIghpcccYLgWfJCe2ylUnPsQ_-KNAI/edit?gid=1878271662#gid=1878271662', '_blank');
    }

    openTemplateSheet = () => {
        window.open('https://docs.google.com/spreadsheets/d/1mwZ37jiEGK7rQnLWp87yUQZHyM6LHb4q6mbB0A07fI0/edit?gid=1722323555#gid=1722323555', '_blank');
    }

    upload = async () => {
        try {
            // 로딩 상태 표시
            const uploadButton = document.querySelector('.upload-button');
            const originalText = uploadButton.innerHTML;
            uploadButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 업로드 중...';
            uploadButton.disabled = true;

            // 브랜드와 아이템 정보 가져오기
            const brand = this.getBrand();
            const item = this.getItem();

            if (!brand || !item) {
                alert('브랜드와 아이템명을 모두 입력해주세요.');
                uploadButton.innerHTML = originalText;
                uploadButton.disabled = false;
                return;
            }

            // 선택된 인플루언서 정보 가져오기
            const selectedInfluencers = [];
            const rows = document.querySelectorAll('#seller-match-center-content .influencer-table tbody tr');
            
            if (!rows || rows.length === 0) {
                alert('선택된 인플루언서가 없습니다.');
                uploadButton.innerHTML = originalText;
                uploadButton.disabled = false;
                return;
            }
            
            // 각 행에서 인플루언서 정보 추출
            rows.forEach(row => {
                const cleanName = row.dataset.cleanName;
                const influencerId = row.dataset.influencerId;
                
                // username 추출 방법 개선
                // username(사용자명)과 clean_name(이름)은 합쳐서 influencerId로 저장되어 있음
                // influencerId 형식: username_clean_name 
                // 사용자명에 언더스코어가 포함될 수 있으므로 마지막 언더스코어를 기준으로 분리
                const lastUnderscoreIndex = influencerId.lastIndexOf('_');
                const username = lastUnderscoreIndex !== -1 ? 
                    influencerId.substring(0, lastUnderscoreIndex) : influencerId;
                
                // 로그 추가
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
                
                selectedInfluencers.push({
                    name: cleanName,
                    username: username,
                    fullNameUsername: nameText,
                    category: categoryText,
                    reelsViews: reelsViewsText,
                    contactMethod: contactMethodText
                });
            });
            
            const result = await window.googleSheetApi.uploadInfluencerData({
                brand,
                item,
                selectedInfluencers
              });
              
              if (result.success) {
                alert(`${result.count}명의 인플루언서 정보가 성공적으로 업로드되었습니다.`);
                this.close();
              }
            
            // 버튼 원상 복구
            uploadButton.innerHTML = originalText;
            uploadButton.disabled = false;
            
            console.log('업로드 완료:', result);
            
        } catch (error) {
            console.error('업로드 중 오류 발생:', error);
            alert('업로드 중 오류가 발생했습니다: ' + error.message);
            document.querySelector('.upload-button').innerHTML = '인원 업로드 하기';
            document.querySelector('.upload-button').disabled = false;
        }
    }

    getBrand = () => {
        return this.brandInput.value.trim();
    }

    getItem = () => {
        return this.itemInput.value.trim();
    }
}

// 전역 인스턴스 생성
//window.dmModal = new DmModal(); 