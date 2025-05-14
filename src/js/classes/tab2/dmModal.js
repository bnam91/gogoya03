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

    // 인증 코드 입력 모달
    createAuthCodeModal() {
        return new Promise((resolve, reject) => {
            const modalHTML = `
                <div id="auth-code-modal" class="modal" style="display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.4);">
                    <div class="modal-content" style="background-color: #fefefe; margin: 15% auto; padding: 20px; border: 1px solid #888; width: 80%; max-width: 500px;">
                        <h3>인증 URL 입력</h3>
                        <p>브라우저에서 인증 후 리다이렉트된 전체 URL을 붙여넣어주세요.</p>
                        <input type="text" id="auth-code-input" style="width: 100%; padding: 8px; margin: 10px 0;" placeholder="http://localhost/?code=... 형식의 URL을 붙여넣으세요">
                        <div style="text-align: right; margin-top: 15px;">
                            <button id="auth-code-submit" style="padding: 8px 16px; background-color: #4CAF50; color: white; border: none; cursor: pointer;">확인</button>
                            <button id="auth-code-cancel" style="padding: 8px 16px; margin-left: 10px; background-color: #f44336; color: white; border: none; cursor: pointer;">취소</button>
                        </div>
                    </div>
                </div>
            `;
            
            // 기존 모달이 있다면 제거
            const existingModal = document.getElementById('auth-code-modal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // 새 모달 추가
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            const modal = document.getElementById('auth-code-modal');
            const input = document.getElementById('auth-code-input');
            const submitButton = document.getElementById('auth-code-submit');
            const cancelButton = document.getElementById('auth-code-cancel');
            
            // URL에서 코드 추출 함수
            const extractCodeFromUrl = (url) => {
                try {
                    const urlObj = new URL(url);
                    return urlObj.searchParams.get('code');
                } catch (e) {
                    // URL이 아닌 경우 입력값 그대로 반환
                    return url;
                }
            };
            
            submitButton.addEventListener('click', () => {
                const inputValue = input.value.trim();
                const code = extractCodeFromUrl(inputValue);
                if (code) {
                    modal.remove();
                    resolve(code);
                } else {
                    alert('유효한 코드를 찾을 수 없습니다. URL을 다시 확인해주세요.');
                }
            });
            
            cancelButton.addEventListener('click', () => {
                modal.remove();
                reject(new Error('인증이 취소되었습니다.'));
            });
            
            // Enter 키 이벤트 처리
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const inputValue = input.value.trim();
                    const code = extractCodeFromUrl(inputValue);
                    if (code) {
                        modal.remove();
                        resolve(code);
                    } else {
                        alert('유효한 코드를 찾을 수 없습니다. URL을 다시 확인해주세요.');
                    }
                }
            });
        });
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
                    alert('Google 계정 인증이 필요합니다. 인증 과정을 시작합니다.');
                    
                    try {
                        // 인증 시작
                        const response = await window.googleSheetApi.startAuth();
                        
                        if (response.authUrl) {
                            // 사용자에게 인증 코드 입력 요청
                            const code = await this.createAuthCodeModal();
                            
                            if (code) {
                                // 인증 코드 처리
                                const authResult = await window.googleSheetApi.handleAuthCode(code);
                                
                                if (authResult.success) {
                                    alert('인증이 완료되었습니다. 다시 업로드를 시도합니다.');
                                    // 업로드 재시도
                                    await this.upload();
                                } else {
                                    throw new Error('인증 실패: ' + (authResult.error || '알 수 없는 오류'));
                                }
                            }
                        }
                    } catch (authError) {
                        console.error('인증 과정 중 오류:', authError);
                        alert('인증 과정 중 오류가 발생했습니다: ' + authError.message);
                    }
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