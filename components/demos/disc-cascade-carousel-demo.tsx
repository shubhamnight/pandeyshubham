import DiscCascadeCarousel from '@/components/ui/disc-cascade-carousel';

const items = [
  { title: 'Apocalypse', src: 'assets/music/01-600.webp', label: '', fine: '' },
  { title: 'Do I Wanna Know?', src: 'assets/music/02-600.webp', label: '', fine: '' },
  { title: 'Where’d All the Time Go?', src: 'assets/music/03-600.webp', label: '', fine: '' },
];

export default function Demo() {
  return <DiscCascadeCarousel items={items} defaultIndex={0} loop details={false} reviews={false}
    background="#0c0d10" color="#e7ebf0" height="560px" ariaLabel="Song catalogue" />;
}
