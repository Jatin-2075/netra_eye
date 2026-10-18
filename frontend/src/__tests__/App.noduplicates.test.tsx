import { afterEach, it, expect, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
vi.mock('../hooks/UseFaceTracker', () => ({ useFaceTracker: () => ({ videoRef:{current:null}, reading:{face:true,x:0,y:0,blink:0.1}, latest:{current:{}}, status:'running', error:null }) }));
vi.mock('../components/CalibrationScreen', async () => { const R = await import('react'); return { default: ({onComplete}:any) => { R.useEffect(()=>{onComplete({centerX:0,centerY:0,xSign:1,ySign:1,leftRange:.3,rightRange:.3,upRange:.3,downRange:.3,blinkOpen:.1,blinkClosed:.8,blinkThreshold:.45,blinkClosedIsHigher:true,verticalUsable:false})},[]); return null; } }; });
vi.mock('../hooks/UseSpeech', () => ({ useSpeech: () => ({ speak(){}, speaking:false, voicesReady:true, hasVoice:true }) }));
import App from '../App';
afterEach(cleanup);
const press = (key: string) => act(() => { fireEvent.keyDown(window, { key }); });


it('no tile renders a duplicate icon or label on any screen', () => {
  const { container } = render(<App />);
  const check = () => {
    container.querySelectorAll('.tile').forEach((tile) => {
      expect(tile.querySelectorAll(':scope > .ico').length).toBeLessThanOrEqual(1);
      expect(tile.querySelectorAll(':scope > .lbl').length).toBeLessThanOrEqual(1);
    });
  };
  check();                                         
  press('Enter'); check();                         
  press('Enter'); check();                         
  press('Escape'); press('ArrowRight'); press('Enter'); check(); 
  press('Escape'); press('ArrowRight'); press('ArrowRight'); press('Enter'); check(); 
});
