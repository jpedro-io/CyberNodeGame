import { CyberNodeGame } from './game';

function App() {
  return (
    <main 
      className="min-h-screen flex items-center justify-center relative w-full overflow-x-hidden"
      style={{ 
        background: 'linear-gradient(135deg, #0D1117 0%, #1a1a2e 100%)',
      }}
    >
      {/* ADICIONADO: flex flex-col items-center w-full max-w-[900px] mx-auto p-4 */}
      <div className="z-10 flex flex-col items-center w-full max-w-[900px] mx-auto p-4">
        <h1 
          className="text-center mb-4 text-4xl sm:text-5xl lg:text-6xl font-bold"
          style={{ 
            fontFamily: 'monospace',
            color: '#00FF88',
            textShadow: '0 0 20px #00FF8860, 0 0 40px #00FF8830',
          }}
        >
          CYBERNODE
        </h1>
        <p 
          className="text-center mb-2 text-sm"
          style={{ 
            fontFamily: 'monospace',
            color: '#666',
          }}
        >Navegue pela rede e invada os servidores do IFBA!</p>
        <p 
          className="text-center mb-6 text-xs"
          style={{ 
            fontFamily: 'monospace',
            color: '#00D4FF',
          }}
        >Criado por João Pedro Campos Rocha</p>
        
        <CyberNodeGame width={900} height={600} />
      </div>
    </main>
  );
}

export default App;