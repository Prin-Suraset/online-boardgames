import { usePathname } from "./lib/navigation";
import { HubPage } from "./pages";
import { RoomPage } from "./pages/room";
import { CardfightDeckPreview } from "./pages/CardfightDeckPreview";
import { AuthModal } from "./components/AuthModal";
import { Navbar } from "./components/Navbar";

export function App() {
  const pathname = usePathname();
  const roomMatch = /^\/room\/([A-Za-z0-9]{6})\/?$/.exec(pathname);
  const deckPreviewMatch = /^\/decks\/cardfight\/?$/.test(pathname);

  const page = roomMatch?.[1] !== undefined
    ? <RoomPage code={roomMatch[1]} />
    : deckPreviewMatch
      ? <CardfightDeckPreview />
    : <HubPage />;

  return (
    <>
      <Navbar />
      {page}
      <AuthModal />
    </>
  );
}
