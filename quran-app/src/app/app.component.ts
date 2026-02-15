import { Component, inject, effect, ElementRef, ViewChild, OnDestroy, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuranService } from './services/quran.service';
import { SafeHtmlPipe } from './pipes/safe-html.pipe';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [CommonModule, FormsModule, SafeHtmlPipe],
    template: `
    <div class="app-container" [class.sidebar-open]="quranService.isSidebarOpen()">
      <!-- Header -->
      <header class="header">
        <div class="header-content">
          <div class="title-section">
            <h1>سورة البقرة (Al-Baqarah)</h1>
            <div class="search-box">
              <input 
                type="text" 
                placeholder="ابحث عن موضوع أو كلمة... (Search)" 
                [ngModel]="quranService.searchQuery()"
                (ngModelChange)="quranService.setSearchQuery($event)"
              >
            </div>
          </div>
          
          <div class="controls-section">
            <div class="audio-controls">
              <button (click)="quranService.togglePlay()" [attr.aria-label]="quranService.isPlaying() ? 'Pause' : 'Play'">
                {{ quranService.isPlaying() ? '⏸ Pause' : '▶ Play' }}
              </button>
              <button (click)="quranService.stop()" aria-label="Stop">⏹ Stop</button>
            </div>
            
            <div class="scroll-control">
              <button 
                [class.active]="quranService.isAutoScroll()"
                (click)="quranService.toggleAutoScroll()"
                aria-label="Toggle Auto Scroll"
              >
                Auto Scroll: {{ quranService.isAutoScroll() ? 'ON' : 'OFF' }}
              </button>
            </div>

            <button class="menu-toggle" (click)="quranService.toggleSidebar()" aria-label="Toggle Menu">
              ☰ Topics
            </button>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="main-content">
        <div class="verses-container" #versesContainer>
          <div 
            *ngFor="let verse of quranService.filteredVerses(); trackBy: trackByVerseNumber" 
            class="verse-card"
            [id]="'verse-' + verse.number"
            [class.active]="verse.number === quranService.currentVerseNumber()"
          >
            <!-- Verse Header Removed as requested -->
            
            <!-- Use innerHTML with SafeHtml pipe -->
            <div class="verse-text">
                <span [innerHTML]="verse.text | safeHtml"></span>
                <span class="ayah-number">﴿{{ verse.number }}﴾</span>
            </div>
          </div>
          
          <div *ngIf="quranService.filteredVerses().length === 0" class="no-results">
            No verses found matching your search.
          </div>
        </div>
      </main>

      <!-- Sidebar -->
      <aside class="sidebar" [class.open]="quranService.isSidebarOpen()">
        <div class="sidebar-header">
          <h2>Subjects of Surah</h2>
          <button (click)="quranService.toggleSidebar()" class="close-btn" aria-label="Close Sidebar">×</button>
        </div>
        <ul class="subject-list">
          <li *ngFor="let subject of quranService.subjects()">
            <button (click)="selectSubject(subject)">
              <div class="topic-title">{{ subject.topic }}</div>
              <span class="verse-range">Verses: {{ subject.verses[0] }} - {{ subject.verses[subject.verses.length - 1] }}</span>
            </button>
          </li>
        </ul>
      </aside>
      
      <!-- Overlay for mobile sidebar -->
      <div 
        class="sidebar-overlay" 
        *ngIf="quranService.isSidebarOpen()" 
        (click)="quranService.toggleSidebar()"
      ></div>
    </div>
  `,
    styleUrls: ['./app.component.css']
})
export class AppComponent implements OnDestroy {
    quranService = inject(QuranService);
    private scrollInterval: any;

    // Using effect to react to verse changes
    constructor() {
        // Effect 1: Handle Verse Highlighting & Jump-Scroll
        effect(() => {
            const verseNum = this.quranService.currentVerseNumber();

            // Should validly scroll ONLY if the verse itself changed. 
            // We check the *current* state of AutoScroll without tracking it as a dependency.
            // This prevents the effect from re-running when isAutoScroll changes.
            const isScrolling = untracked(() => this.quranService.isAutoScroll());

            // Only Jump-Scroll to verse if AutoScroll is OFF.
            if (!isScrolling) {
                setTimeout(() => this.scrollToVerse(verseNum), 100);
            }
        });

        // Effect 2: Handle Auto-Scroll (Teleprompter)
        effect(() => {
            if (this.quranService.isAutoScroll()) {
                this.startSlowScroll();
            } else {
                this.stopSlowScroll();
            }
        });
    }

    startSlowScroll() {
        this.stopSlowScroll(); // ensure clear old
        this.scrollInterval = setInterval(() => {
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.scrollTop += 1;
                // Check if bottom
                if (mainContent.scrollTop + mainContent.clientHeight >= mainContent.scrollHeight) {
                    this.quranService.toggleAutoScroll();
                }
            }
        }, 40); // 25px per second
    }

    stopSlowScroll() {
        if (this.scrollInterval) {
            clearInterval(this.scrollInterval);
            this.scrollInterval = null;
        }
    }

    ngOnDestroy() {
        this.stopSlowScroll();
    }

    trackByVerseNumber(index: number, verse: any): number {
        return verse.number;
    }

    selectSubject(subject: any) {
        if (subject.verses && subject.verses.length > 0) {
            this.quranService.isAutoScroll.set(false);
            this.quranService.scrollToVerse(subject.verses[0]);
            // Close sidebar on mobile or general selection
            if (window.innerWidth < 1024) {
                this.quranService.isSidebarOpen.set(false);
            }
        }
    }

    scrollToVerse(number: number) {
        const el = document.getElementById('verse-' + number);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}
