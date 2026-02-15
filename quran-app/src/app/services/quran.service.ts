import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Verse, Subject } from '../models/quran.models';

@Injectable({
    providedIn: 'root'
})
export class QuranService {
    private http = inject(HttpClient);

    // Data Signals
    verses = signal<Verse[]>([]);
    subjects = signal<Subject[]>([]);

    // UI State Signals
    isPlaying = signal<boolean>(false);
    isAutoScroll = signal<boolean>(false);
    isSidebarOpen = signal<boolean>(false);
    searchQuery = signal<string>('');

    // Audio Element
    audio = new Audio();

    // Currently highlighted/active verse (for sync/tracking)
    currentVerseNumber = signal<number>(1);

    constructor() {
        this.loadData();
        this.setupAudio();
    }

    private setupAudio() {
        // Reliable audio source for Al-Baqarah (Abdul Basit)
        this.audio.src = 'https://download.quranicaudio.com/quran/abdulbaset/002.mp3';
        this.audio.load();

        this.audio.addEventListener('ended', () => {
            this.isPlaying.set(false);
            this.currentVerseNumber.set(1);
        });

        this.audio.addEventListener('error', (e) => {
            console.error('Audio error:', e);
        });

        // Linear approximation for sync (since no timestamps provided)
        this.audio.addEventListener('timeupdate', () => {
            if (this.isAutoScroll() && this.isPlaying() && this.audio.duration) {
                const totalVerses = this.verses().length;
                if (totalVerses > 0) {
                    const progress = this.audio.currentTime / this.audio.duration;
                    const estimatedVerseIndex = Math.floor(progress * totalVerses);
                    // +1 because verses are 1-indexed
                    const nextVerse = this.verses()[estimatedVerseIndex]?.number || 1;

                    if (nextVerse !== this.currentVerseNumber()) {
                        this.currentVerseNumber.set(nextVerse);
                    }
                }
            }
        });
    }

    async loadData() {
        try {
            const versesData: any = await firstValueFrom(this.http.get('data/Al_Baqarah_by_verse.json'));
            const subjectsData: any = await firstValueFrom(this.http.get('data/Subject.json'));

            const versesArray: Verse[] = Object.keys(versesData).map(key => ({
                number: parseInt(key),
                text: versesData[key]
            })).sort((a, b) => a.number - b.number);

            this.verses.set(versesArray);
            this.subjects.set(subjectsData);
        } catch (error) {
            console.error('Error loading Quran data', error);
        }
    }

    toggleSidebar() {
        this.isSidebarOpen.update(v => !v);
    }

    togglePlay() {
        if (this.isPlaying()) {
            this.audio.pause();
        } else {
            this.audio.play();
        }
        this.isPlaying.update(v => !v);
    }

    stop() {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.isPlaying.set(false);
        this.currentVerseNumber.set(1);
    }

    toggleAutoScroll() {
        this.isAutoScroll.update(v => !v);
    }

    setSearchQuery(query: string) {
        this.searchQuery.set(query);
    }

    scrollToVerse(verseNumber: number) {
        this.currentVerseNumber.set(verseNumber);
        // Logic to scroll view will be in component
    }

    // Filtered verses based on search
    filteredVerses = computed(() => {
        const query = this.searchQuery().toLowerCase().trim();
        if (!query) return this.verses();

        // Find subjects matching
        const matchingSubjects = this.subjects().filter(s => s.topic.toLowerCase().includes(query));
        const subjectVerseNumbers = new Set<number>();
        matchingSubjects.forEach(s => s.verses.forEach(v => subjectVerseNumbers.add(v)));

        // Filter verses
        return this.verses().filter(v =>
            subjectVerseNumbers.has(v.number) ||
            v.text.includes(query) ||
            v.number.toString() === query
        );
    });
}
