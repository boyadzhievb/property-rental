import { useState, useMemo, useRef } from 'react';
import { Search, ChevronRight, Phone } from 'lucide-react';
import { useGuests } from '../../hooks/useGuests';
import PageHeader from '../layout/PageHeader';

export default function GuestsView() {
  const { guests, loading } = useGuests();
  const [search, setSearch] = useState('');
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const filteredGuests = useMemo(() => {
    if (!search) return guests;
    const q = search.toLowerCase();
    return guests.filter(g =>
      g.name.toLowerCase().includes(q) || g.phone.includes(q)
    );
  }, [guests, search]);

  const groupedGuests = useMemo(() => {
    const sorted = [...filteredGuests].sort((a, b) => a.name.localeCompare(b.name));
    const groups: Record<string, typeof sorted> = {};
    for (const guest of sorted) {
      const letter = guest.name.charAt(0).toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(guest);
    }
    return groups;
  }, [filteredGuests]);

  const letters = useMemo(() => Object.keys(groupedGuests).sort(), [groupedGuests]);

  const scrollToLetter = (letter: string) => {
    setActiveLetter(letter);
    sectionRefs.current[letter]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) {
    return (
      <div className="pb-24">
        <PageHeader title="Guests" />
        <div className="px-5 text-center text-ios-text-secondary py-12">Loading...</div>
      </div>
    );
  }

  return (
    <div className="pb-24 relative">
      <header className="px-5 pt-12 pb-4 bg-ios-bg sticky top-0 z-10">
        <h1 className="text-3xl font-bold text-ios-text mb-4">Guests</h1>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-ios-text-secondary" />
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border-none rounded-xl leading-5 bg-ios-gray-light text-ios-text placeholder-ios-text-secondary focus:outline-none focus:ring-2 focus:ring-ios-blue focus:bg-ios-card transition-colors"
            placeholder="Search guests..."
          />
        </div>
      </header>

      <div className="flex">
        <div className="flex-1 px-5 mt-2 max-w-screen-md mx-auto">
          {letters.map(letter => (
            <div key={letter} ref={el => { sectionRefs.current[letter] = el; }}>
              <div className="text-sm font-semibold text-ios-text-secondary uppercase px-4 pt-4 pb-1">
                {letter}
              </div>
              <div className="bg-ios-card rounded-2xl overflow-hidden shadow-sm border border-black/[0.04] mb-3">
                <div className="divide-y divide-ios-border/40">
                  {groupedGuests[letter].map(guest => (
                    <div key={guest.id} className="flex items-center p-4 active:bg-ios-gray-light/30 transition-colors cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-ios-text text-lg">{guest.name}</div>
                        <div className="flex items-center gap-1 text-sm text-ios-text-secondary">
                          <Phone size={12} />
                          <span>{guest.phone}</span>
                        </div>
                      </div>
                      <ChevronRight className="text-ios-border flex-shrink-0" size={20} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {letters.length === 0 && (
            <div className="text-center text-ios-text-secondary py-12">No guests found.</div>
          )}
        </div>

        {letters.length > 1 && (
          <div className="fixed right-1 top-1/2 -translate-y-1/2 flex flex-col items-center z-20 py-2">
            {letters.map(letter => (
              <button
                key={letter}
                onClick={() => scrollToLetter(letter)}
                className={`text-[11px] font-semibold w-5 h-5 flex items-center justify-center rounded-full transition-colors ${
                  activeLetter === letter
                    ? 'bg-ios-blue text-white'
                    : 'text-ios-blue hover:bg-ios-blue/10'
                }`}
              >
                {letter}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
