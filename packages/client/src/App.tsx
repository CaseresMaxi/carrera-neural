import { Scene } from './scene/Scene';
import { useGame } from './store';
import { FactionPanels, GameLog, HelpModal, HotseatCover, Toast, TopBar, WinnerModal } from './ui/Hud';
import { GladeInfo, PlayerBoard } from './ui/PlayerBoard';
import { CardInspector } from './ui/CardInspector';
import { Lobby } from './ui/Lobby';
import { Landing } from './ui/Landing';
import { Menu } from './ui/Menu';
import { Studio } from './ui/Studio';

export function App() {
  const screen = useGame((s) => s.screen);
  const boardOpen = useGame((s) => s.boardOpen);
  return (
    <>
      {screen === 'game' && (
        <div className={`game ${boardOpen ? 'pb-open' : ''}`}>
          <div className="canvas-wrap">
            <Scene />
          </div>
          <TopBar />
          <FactionPanels />
          <GameLog />
          <GladeInfo />
          <PlayerBoard />
          <HelpModal />
          <CardInspector />
          <WinnerModal />
          <HotseatCover />
        </div>
      )}
      {screen === 'landing' && <Landing />}
      {screen === 'menu' && <Menu />}
      {screen === 'studio' && <Studio onClose={() => useGame.setState({ screen: 'menu' })} />}
      {screen === 'lobby' && <Lobby />}
      <Toast />
    </>
  );
}
