import BottleFlip, { WORLDS } from './game';
import React from 'react';
import ReactDOM from 'react-dom';
import { rem } from './utils';
import glamorous, {Div} from 'glamorous';

const game = new BottleFlip();
game.start();

const Button = glamorous.div({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  cursor: 'pointer',
  backgroundColor: '#E8750A',
  color: '#FFFFFF',
  fontWeight: 'bold',
  fontSize: rem(54),
  lineHeight: 'normal',
  height: rem(156),
  width: rem(512),
  borderRadius: rem(156 / 2),
  margin: '0 auto',
  boxShadow: '0 4px 20px rgba(232, 117, 10, 0.4)',
  letterSpacing: '0.5px',
});

const Wrapper = glamorous.div({
  width: '10rem',
  margin: '0 auto',
  position: 'relative',
  minHeight: '100%',
})

class Loading extends React.Component {
  state = { progress: 0 };
  done = false;

  componentDidMount() {
    this.timer = setInterval(() => {
      this.setState(prev => {
        const next = Math.min(prev.progress + Math.random() * 12 + 4, 100);
        if (next >= 100 && !this.done) {
          this.done = true;
          clearInterval(this.timer);
          setTimeout(() => this.props.onLoaded(), 500);
        }
        return { progress: next };
      });
    }, 180);
  }

  componentWillUnmount() {
    clearInterval(this.timer);
  }

  render() {
    return (
      <div style={{
        position: 'fixed', left: 0, right: 0, top: 0, bottom: 0,
        background: '#2D3319',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        color: '#FFFFFF',
      }}>
        <div style={{
          fontSize: '3rem', fontWeight: 'bold', color: '#E8750A',
          marginBottom: '0.5rem', textAlign: 'center',
        }}>
          {'\u{1F357}'}
        </div>
        <div style={{
          fontSize: '1.5rem', fontWeight: 'bold', color: '#FFFFFF',
          marginBottom: '0.3rem',
        }}>
          La Maison PB
        </div>
        <div style={{
          fontSize: '0.75rem', color: '#8CB33F',
          marginBottom: '2rem', letterSpacing: '2px',
        }}>
          POULET BRAISÉ DEPUIS 2009
        </div>
        <div style={{
          width: '60%', maxWidth: '280px', height: '6px',
          backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '3px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${this.state.progress}%`, height: '100%',
            backgroundColor: '#E8750A', borderRadius: '3px',
            transition: 'width 0.2s ease-out',
          }} />
        </div>
        <div style={{
          marginTop: '0.8rem', fontSize: '0.7rem',
          color: 'rgba(255,255,255,0.5)',
        }}>
          {Math.round(this.state.progress)}%
        </div>
      </div>
    );
  }
}

const WORLD_ICONS = {
  restaurant: '\u{1F357}',
  espace: '\u{1F680}',
  ocean: '\u{1F30A}',
  nuit: '\u{1F3C6}',
};

class Landing extends React.Component {
  state = { selectedWorld: 'restaurant' };

  handleStartClick = e => {
    this.props.onStart(this.state.selectedWorld);
  }

  selectWorld = (id) => {
    this.setState({ selectedWorld: id });
    game.setWorld(id);
  }

  render() {
    const worldIds = Object.keys(WORLDS);
    return <div style={{
      position: 'fixed', left: 0, right: 0, top: 0, bottom: 0,
      background: 'rgba(45, 51, 25, 0.85)', color: '#ffffff',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'space-between',
      padding: '6vh 20px 5vh',
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <span role="img" aria-label="poulet" style={{ fontSize: '36px', display: 'block', marginBottom: '4px' }}>{'\u{1F357}'}</span>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#E8750A', textShadow: '0 2px 12px rgba(232,117,10,0.4)' }}>Poulet Braisé Flip</div>
        <div style={{ fontSize: '10px', color: '#8CB33F', letterSpacing: '3px', marginTop: '4px' }}>DEPUIS 2009</div>
      </div>

      {/* World selector — 2x2 grid */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '10px', letterSpacing: '1px' }}>CHOISIS TON MONDE</div>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: '10px',
        }}>
          {worldIds.map(id => {
            const w = WORLDS[id];
            const selected = this.state.selectedWorld === id;
            return <div
              key={id}
              onClick={() => this.selectWorld(id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center',
                padding: '12px 8px', borderRadius: '12px', cursor: 'pointer',
                background: selected ? 'rgba(232,117,10,0.2)' : 'rgba(255,255,255,0.06)',
                border: selected ? '2px solid #E8750A' : '2px solid rgba(255,255,255,0.1)',
                width: '100px',
                transition: 'all 0.2s',
              }}
            >
              <span role="img" aria-label={w.name} style={{ fontSize: '28px' }}>{WORLD_ICONS[id]}</span>
              <span style={{
                fontSize: '11px', marginTop: '4px', letterSpacing: '0.5px',
                color: selected ? '#E8750A' : 'rgba(255,255,255,0.6)',
                fontWeight: selected ? 'bold' : 'normal',
              }}>{w.name}</span>
            </div>;
          })}
        </div>
      </div>

      {/* Start button */}
      <div
        onClick={this.handleStartClick}
        style={{
          backgroundColor: '#E8750A', color: '#fff', fontWeight: 'bold',
          fontSize: '16px', padding: '14px 48px', borderRadius: '30px',
          cursor: 'pointer', boxShadow: '0 4px 20px rgba(232,117,10,0.4)',
        }}
      >Start Game</div>
    </div>;
  }
}

class Game extends React.Component {
  container = null;
  state = {
    started: false
  }
  onRef = ref => {
    this.container = ref;
  }

  handleGameOver = async () => {
    this.props.onGameOver();
  }

  componentDidMount() {
    this.container.appendChild(game.renderer.domElement);
    game.addEventListener('gameover', this.handleGameOver);
  }

  componentWillUnmount() {
    this.container.removeChild(game.renderer.domElement);
    game.removeEventListener('gameover', this.handleGameOver);
  }

  render() {
    return <Wrapper>
      <div ref={this.onRef}></div>
    </Wrapper>
  }
}

class Score extends React.Component {
  render() {
    return <div style={{
      position: 'fixed', left: 0, right: 0, top: 0, bottom: 0,
      background: 'rgba(45, 51, 25, 0.92)', color: '#ffffff',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12vh 0 8vh',
    }}>
      {/* Score */}
      <div style={{ textAlign: 'center' }}>
        <span role="img" aria-label="poulet" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.2rem' }}>{'\u{1F357}'}</span>
        <div style={{ fontSize: '0.7rem', color: '#8CB33F', marginTop: '0.3rem' }}>Score du Round</div>
        <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: '#E8750A', margin: '0.2rem 0' }}>{ this.props.round }</div>
        <div style={{ fontSize: '0.7rem', color: '#8CB33F' }}>Meilleur Score : { this.props.highest }</div>
      </div>

      {/* Buttons */}
      <div style={{ width: '100%', textAlign: 'center' }}>
        <Button onClick={this.props.onRestart}>Rejouer</Button>
        <div
          onClick={this.props.onHome}
          style={{
            marginTop: '0.8rem', cursor: 'pointer',
            fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)',
            letterSpacing: '1px',
          }}
        >
          {'\u{2190}'} Changer de monde
        </div>
      </div>
    </div>
  }
}

const STATE_LOADING = 'loading';
const STATE_LANDING = 'landing';
const STATE_GAME = 'game';
const STATE_GAMEOVER = 'gameover';

class App extends React.Component {
  state={
    state: STATE_LOADING,
    highest: parseInt(localStorage.getItem('highest') || '0', 10),
    round: 0,
  }

  renderUI() {
    switch (this.state.state) {
      case STATE_LOADING:
        return (
          <Loading
            onLoaded={() => {
              this.setState({state: STATE_LANDING});
            }}
          />
        );
      case STATE_GAMEOVER:
        return (
          <Score
            round={this.state.round}
            highest={this.state.highest}
            onRestart={
              () => {
                game.restart();
                this.setState({state: STATE_GAME});
              }
            }
            onHome={
              () => {
                this.setState({state: STATE_LANDING});
              }
            }
          />
        );
      case STATE_LANDING:
          return (
            <Landing
              onStart={
                () => {
                  game.restart();
                  this.setState({state: STATE_GAME});
                }
              }
            />
          );
      case STATE_GAME:
      default:
          return null;
    }
  }

  render() {
    return (
      <React.Fragment>
        <Game
          onGameOver={
            () => {
              let highest = this.state.highest;
              if (game.score > this.state.highest) {
                highest = game.score;
                localStorage.setItem('highest', highest.toString())
              }
              this.setState({highest, round: game.score, state: STATE_GAMEOVER});
            }
          }
        />
        { this.renderUI() }
      </React.Fragment>
    );
  }
}


ReactDOM.render(<App/>, document.getElementById('root'));
