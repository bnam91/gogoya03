/**
 * renderPage.js
 * @fileoverview 페이지 fetch 및 동적 모듈 로딩 유틸리티
 */
import { menuData } from '../data/menuData.js';

export async function renderPage(pagePath) {
  const content = document.getElementById('content');
  console.log('pagePath:', pagePath);

  const contentId = pagePath.split('/').pop() + '-content';
  console.log('contentId:', contentId);

  // 모든 콘텐츠 숨김
  document.querySelectorAll('.content-section').forEach(section => {
    section.style.display = 'none';
  });

  // 페이지를 새로 create 해야하는 페이지
  const reCreateContentPage = [
    'tab1/home',
    'tab2/screening'
  ];

  // 페이지를 숨겨야 하는 페이지
  if (!reCreateContentPage.includes(pagePath)) {
  const existingSection = document.getElementById(contentId);

  if (existingSection) {
    existingSection.style.display = 'block';
    updateBreadcrumbFromMenu(pagePath); // ✅ 숨겨진 페이지 다시 보여줄 때도 브레드크럼 갱신
    return;
    }
  }

  try {
    console.log('renderPage try');
    const [folder, file] = pagePath.split('/');
    const response = await fetch(`./src/pages/tabs/${folder}/${file}.html`);
    if (!response.ok) throw new Error('❌ 페이지 로딩 실패');

    const html = await response.text();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const newSection = tempDiv.querySelector('.content-section');
    if (newSection) {
      newSection.style.display = 'block';
      
      // 이미 존재하는 섹션인지 확인
      const existingNewSection = document.getElementById(contentId);
      if (existingNewSection) {
        // 기존 섹션 제거
        existingNewSection.remove();
      }

      // 초기화 후 append
      await additionalPageLoad(pagePath, newSection);
      content.appendChild(newSection);
      newSection.classList.add('active');
    }

    await additionalPageLoad(pagePath, newSection || content);
    // 렌더 타이밍 보장 후 브레드크럼 업데이트
    requestAnimationFrame(() => {
      updateBreadcrumbFromMenu(pagePath);
    });

    try {
      const module = await import(`../tabs/${folder}/${file}.js`);
      if (module?.initPage) module.initPage();
    } catch (err) {
      console.warn(`⚠️ JS 모듈 없음 또는 로딩 실패 (무시 가능): ${err.message}`);
    }

  } catch (error) {
    console.error('❌ 페이지 렌더링 실패:', error.message);
    content.innerHTML = `
      <div class="error-page">
        <h2>페이지를 불러올 수 없습니다.</h2>
        <p>관리자에게 문의하세요.</p>
      </div>
    `;
  }
}


export function updateBreadcrumbFromMenu(pagePath) {
  console.log('updateBreadcrumbFromMenu', pagePath);
  const contentId = pagePath.split('/').pop() + '-content';
  const activeSection = document.getElementById(contentId);

  if (!activeSection) return;

  const mainElement = activeSection.querySelector('#breadcrumb-main');
  const currentElement = activeSection.querySelector('#breadcrumb-current');

  let mainTitle = '';
  let currentTitle = '';

  for (const menu of menuData) {
    if (menu.page && pagePath === menu.page) {
      mainTitle = menu.title;
      break;
    }

    if (menu.children) {
      const foundChild = menu.children.find(child => child.page === pagePath);
      if (foundChild) {
        mainTitle = menu.title;
        currentTitle = foundChild.title;
        break;
      }
    }
  }

  if (mainElement) mainElement.textContent = mainTitle || '홈';
  if (currentElement) currentElement.textContent = currentTitle || '';
}

// 페이지 내 추가 콘텐츠 로드
export async function additionalPageLoad(pagePath, content) {
  // 홈 페이지 추가 콘텐츠 로드
  if (pagePath === 'tab1/home') {
    const loginBtn = content.querySelector('.login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', function() {
        window.location.href = './src/pages/member/login.html';
      });
    }
    const signupBtn = content.querySelector('.signup-btn');
    if (signupBtn) {
      signupBtn.addEventListener('click', function() {
        window.location.href = './src/pages/member/signup.html';
      });
    }
  }

  // 브랜드 컨택 페이지 추가 콘텐츠 로드
  if (pagePath === 'tab2/brand-contact') {
    // 중복 추가 방지 (이미 있는 경우 생략)
    if (content.querySelector('#call-confirm-modal')) {
      console.log('⚠️ call-modal 이미 추가됨');
      return;
    }

    try {
      const modalResponse = await fetch('./src/pages/components/call-modal.html');
      if (modalResponse.ok) {
        const modalHtml = await modalResponse.text();
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = modalHtml;

        // 모달은 해당 콘텐츠 영역에만 추가
        content.appendChild(tempDiv);
        console.log('✅ call-modal.html 추가 완료');
      } else {
        throw new Error(`상태 코드 ${modalResponse.status}`);
      }
    } catch (e) {
      console.error('❌ call-modal 불러오기 실패:', e.message);
    }
  }
}
