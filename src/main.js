import { GiftScene } from './three-scene.js';
import { soundCtrl } from './audio.js';
import confetti from 'canvas-confetti';

// Fallback photos list
const DEFAULT_PHOTOS = [
  { id: 1, file: 'photos/photo-01.jpg', aspect: 0.75 },
  { id: 2, file: 'photos/photo-02.jpg', aspect: 1.33 },
  { id: 3, file: 'photos/photo-03.jpg', aspect: 0.75 },
  { id: 4, file: 'photos/photo-04.jpg', aspect: 0.75 },
  { id: 5, file: 'photos/photo-05.jpg', aspect: 1.33 },
  { id: 6, file: 'photos/photo-06.jpg', aspect: 0.75 },
  { id: 7, file: 'photos/photo-07.jpg', aspect: 1.33 },
  { id: 8, file: 'photos/photo-08.jpg', aspect: 0.75 },
  { id: 9, file: 'photos/photo-09.jpg', aspect: 0.75 },
  { id: 10, file: 'photos/photo-10.jpg', aspect: 0.75 },
  { id: 11, file: 'photos/photo-11.jpg', aspect: 0.75 },
  { id: 12, file: 'photos/photo-12.jpg', aspect: 0.75 },
  { id: 13, file: 'photos/photo-13.jpg', aspect: 0.75 },
  { id: 14, file: 'photos/photo-14.jpg', aspect: 1.33 }
];

class App {
  constructor() {
    this.currentScreen = 'intro';
    this.photos = DEFAULT_PHOTOS;
    this.currentPhotoIdx = 0;
    this.giftScene = null;
    this.hasWebGL = false;

    // Screens
    this.screens = {
      intro: document.getElementById('screen-intro'),
      greeting: document.getElementById('screen-greeting'),
      gallery: document.getElementById('screen-gallery'),
      finale: document.getElementById('screen-finale')
    };

    this.canvasContainer = document.getElementById('canvas-container');
    this.cssFallback = document.getElementById('css-fallback');
    this.openingStatus = document.getElementById('opening-status');

    // Action buttons
    this.btnOpenGift = document.getElementById('btn-open-gift');
    this.btnViewPhotos = document.getElementById('btn-view-photos');
    this.btnFinishGallery = document.getElementById('btn-finish-gallery');
    this.btnBackToGreeting = document.getElementById('btn-back-to-greeting');
    this.btnRestart = document.getElementById('btn-restart');
    this.btnBackToPhotos = document.getElementById('btn-back-to-photos');
    this.btnSoundToggle = document.getElementById('btn-sound-toggle');
    this.soundIcon = document.getElementById('sound-icon');
    this.soundText = document.getElementById('sound-text');

    // Single-photo album elements
    this.albumCounter = document.getElementById('album-counter');
    this.albumPrev = document.getElementById('album-prev');
    this.albumNext = document.getElementById('album-next');
    this.photoViewerCard = document.getElementById('photo-viewer-card');
    this.viewerImg = document.getElementById('viewer-img');
    this.viewerSkeleton = document.getElementById('viewer-skeleton');
    this.thumbsStrip = document.getElementById('thumbs-strip');

    // Lightbox Modal
    this.lightbox = document.getElementById('lightbox');
    this.lightboxImg = document.getElementById('lightbox-img');
    this.lightboxCounter = document.getElementById('lightbox-counter');
    this.lightboxClose = document.getElementById('lightbox-close');
    this.lightboxPrev = document.getElementById('lightbox-prev');
    this.lightboxNext = document.getElementById('lightbox-next');

    // Touch gesture variables
    this.touchStartX = 0;
    this.touchStartY = 0;
  }

  async init() {
    this.init3DScene();
    this.initSoundEvents();
    this.initNavigation();
    this.initAlbumSlider();
    this.initLightbox();
    await this.loadPhotosData();
    this.setupAlbumView();
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.scrollTo({ top: 0, behavior: 'smooth' });
  }

  init3DScene() {
    this.giftScene = new GiftScene(this.canvasContainer);
    this.hasWebGL = this.giftScene.init();

    if (!this.hasWebGL) {
      console.warn('WebGL is unavailable. Falling back to CSS 3D Box.');
      this.canvasContainer.style.display = 'none';
      this.cssFallback.classList.add('active');
    }
  }

  initSoundEvents() {
    const unlockAudio = () => {
      soundCtrl.resume();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });

    this.btnSoundToggle.addEventListener('click', () => {
      const isMuted = soundCtrl.toggleMute();
      this.soundIcon.textContent = isMuted ? '🔇' : '🔊';
      this.soundText.textContent = isMuted ? 'Без звука' : 'Звук';
      this.btnSoundToggle.setAttribute(
        'aria-label',
        isMuted ? 'Включить звук' : 'Выключить звук'
      );
    });
  }

  initNavigation() {
    this.btnOpenGift.addEventListener('click', () => {
      this.startGiftOpening();
    });

    this.btnViewPhotos.addEventListener('click', () => {
      this.showScreen('gallery');
      this.scrollToTop();
    });

    this.btnFinishGallery.addEventListener('click', () => {
      this.showScreen('finale');
      this.scrollToTop();
    });

    this.btnBackToGreeting.addEventListener('click', () => {
      this.showScreen('greeting');
      this.scrollToTop();
    });

    this.btnBackToPhotos.addEventListener('click', () => {
      this.showScreen('gallery');
      this.scrollToTop();
    });

    this.btnRestart.addEventListener('click', () => {
      this.restartExperience();
      this.scrollToTop();
    });
  }

  showScreen(name) {
    this.currentScreen = name;

    Object.keys(this.screens).forEach(key => {
      if (key === name) {
        this.screens[key].classList.add('active');
      } else {
        this.screens[key].classList.remove('active');
      }
    });

    // Dim 3D scene when inside photo album or finale so text and memories have full clarity
    if (name === 'gallery' || name === 'finale') {
      this.canvasContainer.classList.add('dimmed');
    } else {
      this.canvasContainer.classList.remove('dimmed');
    }
  }

  startGiftOpening() {
    this.btnOpenGift.classList.add('opening-state');
    this.btnOpenGift.innerHTML = '<span>Открываем...</span> <span class="btn-sparkle">✨</span>';
    this.openingStatus.style.display = 'inline-flex';

    // Golden festive confetti celebration when lid opens
    setTimeout(() => {
      try {
        confetti({
          particleCount: 75,
          spread: 75,
          origin: { y: 0.58 },
          colors: ['#f5d78e', '#dcb355', '#ffffff', '#ba8c2d', '#ffe8a3'],
          disableForReducedMotion: true
        });
        setTimeout(() => {
          confetti({
            particleCount: 40,
            angle: 60,
            spread: 55,
            origin: { x: 0.15, y: 0.65 },
            colors: ['#f5d78e', '#dcb355', '#ffe8a3'],
            disableForReducedMotion: true
          });
          confetti({
            particleCount: 40,
            angle: 120,
            spread: 55,
            origin: { x: 0.85, y: 0.65 },
            colors: ['#f5d78e', '#dcb355', '#ffe8a3'],
            disableForReducedMotion: true
          });
        }, 350);
      } catch (e) {
        console.warn('Confetti launch error:', e);
      }
    }, 2200);

    if (this.hasWebGL && this.giftScene) {
      this.giftScene.openBox(() => {
        this.openingStatus.style.display = 'none';
        this.showScreen('greeting');
      });
    } else {
      this.cssFallback.classList.add('opened');
      soundCtrl.playRibbonWhoosh();
      setTimeout(() => {
        soundCtrl.playBoxOpeningChime();
        soundCtrl.startAmbientMusic();
      }, 1500);

      setTimeout(() => {
        this.openingStatus.style.display = 'none';
        this.showScreen('greeting');
      }, 4200);
    }
  }

  restartExperience() {
    if (this.hasWebGL && this.giftScene) {
      this.giftScene.resetBox();
    } else {
      this.cssFallback.classList.remove('opened');
    }

    this.btnOpenGift.classList.remove('opening-state');
    this.btnOpenGift.innerHTML = '<span>Открыть подарок</span> <span class="btn-sparkle" aria-hidden="true">✨</span>';
    this.openingStatus.style.display = 'none';
    this.currentPhotoIdx = 0;
    this.displayPhoto(0);
    this.showScreen('intro');
  }

  async loadPhotosData() {
    try {
      const res = await fetch('./photos.json');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          this.photos = data;
        }
      }
    } catch {
      // DEFAULT_PHOTOS fallback
    }
  }

  setupAlbumView() {
    // Generate mini-thumbnails
    this.thumbsStrip.innerHTML = '';
    this.photos.forEach((photo, idx) => {
      const thumb = document.createElement('div');
      thumb.className = `thumb-item ${idx === 0 ? 'active' : ''}`;
      thumb.setAttribute('role', 'tab');
      thumb.setAttribute('aria-label', `Фотография ${idx + 1}`);

      const img = document.createElement('img');
      img.src = photo.file;
      img.alt = `Миниатюра ${idx + 1}`;
      img.loading = 'lazy';
      thumb.appendChild(img);

      thumb.addEventListener('click', () => {
        this.displayPhoto(idx);
      });

      this.thumbsStrip.appendChild(thumb);
    });

    // Display initial photo
    this.displayPhoto(0);
  }

  displayPhoto(idx) {
    this.currentPhotoIdx = (idx + this.photos.length) % this.photos.length;
    const photo = this.photos[this.currentPhotoIdx];

    // Show skeleton & fade out current
    this.viewerSkeleton.style.display = 'block';
    this.viewerImg.style.opacity = '0';
    this.viewerImg.style.transform = 'scale(0.97)';

    this.viewerImg.src = photo.file;
    this.viewerImg.onload = () => {
      this.viewerSkeleton.style.display = 'none';
      this.viewerImg.style.opacity = '1';
      this.viewerImg.style.transform = 'scale(1)';
    };

    this.viewerImg.onerror = () => {
      this.viewerSkeleton.style.display = 'none';
      this.viewerImg.style.opacity = '0.5';
    };

    // Update counter
    this.albumCounter.textContent = `${this.currentPhotoIdx + 1} из ${this.photos.length}`;

    // Highlight thumbnail and scroll into view smoothly
    const thumbs = this.thumbsStrip.querySelectorAll('.thumb-item');
    thumbs.forEach((th, i) => {
      if (i === this.currentPhotoIdx) {
        th.classList.add('active');
        th.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } else {
        th.classList.remove('active');
      }
    });
  }

  initAlbumSlider() {
    // Prev / Next button clicks
    this.albumPrev.addEventListener('click', () => {
      this.displayPhoto(this.currentPhotoIdx - 1);
    });

    this.albumNext.addEventListener('click', () => {
      this.displayPhoto(this.currentPhotoIdx + 1);
    });

    // Tap on image card opens full-screen Lightbox
    this.photoViewerCard.addEventListener('click', () => {
      this.openLightbox(this.currentPhotoIdx);
    });

    this.photoViewerCard.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.openLightbox(this.currentPhotoIdx);
      }
    });

    // Touch swipe gestures on the photo card (Mobile ergonomics!)
    this.photoViewerCard.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    this.photoViewerCard.addEventListener('touchend', (e) => {
      if (e.changedTouches.length === 1) {
        const deltaX = e.changedTouches[0].clientX - this.touchStartX;
        const deltaY = e.changedTouches[0].clientY - this.touchStartY;

        // Swipe horizontal threshold 40px
        if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
          if (deltaX < 0) {
            // Swiped left -> next photo
            this.displayPhoto(this.currentPhotoIdx + 1);
          } else {
            // Swiped right -> prev photo
            this.displayPhoto(this.currentPhotoIdx - 1);
          }
        }
      }
    }, { passive: true });

    // Global keyboard arrows navigation
    window.addEventListener('keydown', (e) => {
      if (this.currentScreen === 'gallery' && !this.lightbox.classList.contains('active')) {
        if (e.key === 'ArrowLeft') {
          this.displayPhoto(this.currentPhotoIdx - 1);
        } else if (e.key === 'ArrowRight' || e.key === ' ') {
          e.preventDefault();
          this.displayPhoto(this.currentPhotoIdx + 1);
        }
      }
    });
  }

  initLightbox() {
    this.lightboxClose.addEventListener('click', () => this.closeLightbox());
    this.lightboxPrev.addEventListener('click', () => {
      this.displayPhoto(this.currentPhotoIdx - 1);
      this.updateLightboxContent();
    });
    this.lightboxNext.addEventListener('click', () => {
      this.displayPhoto(this.currentPhotoIdx + 1);
      this.updateLightboxContent();
    });

    this.lightbox.addEventListener('click', (e) => {
      if (e.target === this.lightbox) {
        this.closeLightbox();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (!this.lightbox.classList.contains('active')) return;

      if (e.key === 'Escape') {
        this.closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        this.displayPhoto(this.currentPhotoIdx - 1);
        this.updateLightboxContent();
      } else if (e.key === 'ArrowRight') {
        this.displayPhoto(this.currentPhotoIdx + 1);
        this.updateLightboxContent();
      }
    });

    // Lightbox swipe gestures
    this.lightbox.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    this.lightbox.addEventListener('touchend', (e) => {
      if (e.changedTouches.length === 1) {
        const deltaX = e.changedTouches[0].clientX - this.touchStartX;
        const deltaY = e.changedTouches[0].clientY - this.touchStartY;

        if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY)) {
          if (deltaX < 0) {
            this.displayPhoto(this.currentPhotoIdx + 1);
            this.updateLightboxContent();
          } else {
            this.displayPhoto(this.currentPhotoIdx - 1);
            this.updateLightboxContent();
          }
        } else if (deltaY > 80 && Math.abs(deltaY) > Math.abs(deltaX)) {
          this.closeLightbox();
        }
      }
    }, { passive: true });
  }

  openLightbox(idx) {
    this.currentPhotoIdx = idx;
    this.updateLightboxContent();
    this.lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
    this.lightboxClose.focus();
  }

  closeLightbox() {
    this.lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  updateLightboxContent() {
    const photo = this.photos[this.currentPhotoIdx];
    this.lightboxImg.style.opacity = '0';
    this.lightboxImg.src = photo.file;
    this.lightboxImg.onload = () => {
      this.lightboxImg.style.opacity = '1';
    };
    this.lightboxCounter.textContent = `${this.currentPhotoIdx + 1} / ${this.photos.length}`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
