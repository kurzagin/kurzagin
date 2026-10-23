'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, Check, RotateCcw, Volume2, Sparkles, User, Terminal } from 'lucide-react';

interface DialogueStep {
  id: number;
  speaker: string;
  role?: string;
  text: string;
  isInput?: boolean;
  flavor?: 'narration' | 'dialogue' | 'thought' | 'alert';
}

const INITIAL_STEPS: DialogueStep[] = [
  {
    id: 1,
    speaker: 'NARRATION',
    flavor: 'narration',
    text: 'A pungent scent of sea salt, medicinal herbs, and burnt incense pulls your consciousness from the abyss. The ceiling above you is coarse, weathered canvas billowing softly against a damp coastal gale.',
  },
  {
    id: 2,
    speaker: 'NARRATION',
    flavor: 'narration',
    text: 'A dull, rhythmic throbbing echoes inside your skull. You try to grasp your surroundings, but your mind feels like a hollow vessel scoured by dark waters.',
  },
  {
    id: 3,
    speaker: '???',
    role: 'Approaching Steps',
    flavor: 'dialogue',
    text: '—Admiral! You’re finally awake!',
  },
  {
    id: 4,
    speaker: 'NARRATION',
    flavor: 'narration',
    text: 'The tent flap is thrust open. A young woman steps in, her breath hurried. Animal ears twitch atop her head, sharp spatial instincts assessing the tent in a fraction of a second. At her side rests the solemn, unearthly silhouette of The Forgiver.',
  },
  {
    id: 5,
    speaker: 'Soraishi',
    role: 'Chief Captain · The Flood Army',
    flavor: 'dialogue',
    text: 'Thank the heavens... We barely managed to pull you back to the perimeter camp here in Dilmun. The Cult of Tiamat ambushed our landing team without warning.',
  },
  {
    id: 6,
    speaker: 'Soraishi',
    role: 'Chief Captain · The Flood Army',
    flavor: 'dialogue',
    text: 'Their vanguard surged through the abyssal tide. We repelled the zealots, but their ritualist struck you directly before Dr. Triad could intervene.',
  },
  {
    id: 7,
    speaker: 'NARRATION',
    flavor: 'narration',
    text: 'She notices your blank expression, eyes scanning your face with growing dread. Your stare reflects only emptiness.',
  },
  {
    id: 8,
    speaker: 'Soraishi',
    role: 'Chief Captain · The Flood Army',
    flavor: 'dialogue',
    text: 'Admiral...? Can you hear my voice? Please... tell me you know who you are. What is your name?',
  },
  {
    id: 9,
    speaker: 'ADMIRAL',
    role: 'Identity Verification',
    flavor: 'thought',
    text: 'Who... am I? What was my name?',
    isInput: true,
  },
  {
    id: 10,
    speaker: 'NARRATION',
    flavor: 'narration',
    text: 'You mutter the words with hesitation. The name sounds foreign even to your own ears, as if spoken by someone standing behind you.',
  },
  {
    id: 11,
    speaker: 'Soraishi',
    role: 'Chief Captain · The Flood Army',
    flavor: 'dialogue',
    text: '...Oh. So that is how it is...',
  },
  {
    id: 12,
    speaker: 'Soraishi',
    role: 'Chief Captain · The Flood Army',
    flavor: 'dialogue',
    text: 'Your memory... has been completely erased. The curse afflicted by the Cult of Tiamat penetrated the seal.',
  },
  {
    id: 13,
    speaker: 'Soraishi',
    role: 'Chief Captain · The Flood Army',
    flavor: 'dialogue',
    text: 'Do not panic, Admiral. As long as The Preserver of Life floats, we will find a way to break their hex. Rest now... I will stand guard outside.',
  },
];

export default function HeartOfEaVN() {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [userName, setUserName] = useState<string>('Admiral');
  const [confirmedName, setConfirmedName] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const transcriptBottomRef = useRef<HTMLDivElement>(null);

  const currentStep = INITIAL_STEPS[currentStepIndex];
  const isFinished = currentStepIndex >= INITIAL_STEPS.length - 1;

  useEffect(() => {
    if (autoScroll && transcriptBottomRef.current) {
      transcriptBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentStepIndex, autoScroll]);

  const handleNext = () => {
    if (currentStep?.isInput && !confirmedName) return;
    if (currentStepIndex < INITIAL_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleConfirmName = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = userName.trim() || 'Admiral';
    setConfirmedName(finalName);
    setCurrentStepIndex((prev) => prev + 1);
  };

  const handleRestart = () => {
    setCurrentStepIndex(0);
    setConfirmedName('');
    setUserName('Admiral');
  };

  // Compile full transcript for clipboard
  const getFullTranscript = () => {
    const revealedSteps = INITIAL_STEPS.slice(0, currentStepIndex + 1);
    const activeName = confirmedName || userName || 'Admiral';

    return revealedSteps
      .map((step) => {
        let text = step.text;
        if (step.isInput) {
          text = `[Identifies as: "${activeName}"]`;
        } else {
          text = text.replace(/Admiral/g, activeName);
        }

        if (step.flavor === 'narration') {
          return `* ${text}\n`;
        }
        return `${step.speaker}${step.role ? ` (${step.role})` : ''}: "${text}"\n`;
      })
      .join('\n');
  };

  const handleCopyTranscript = async () => {
    try {
      await navigator.clipboard.writeText(getFullTranscript());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const activeName = confirmedName || userName || 'Admiral';

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', padding: '16px' }}>
      {/* Top Navigation & Status Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
          paddingBottom: '12px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <Link
          href="/novels/heart-of-ea"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: 'var(--mono)',
            fontSize: '0.78rem',
            color: 'var(--text-2)',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={14} /> Back to Heart of Ea
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleCopyTranscript}
            className="post-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '0.75rem',
              fontFamily: 'var(--mono)',
              background: copied ? 'var(--green-soft)' : 'var(--bg-2)',
              color: copied ? '#fff' : 'var(--text-0)',
              borderColor: copied ? 'transparent' : 'var(--border)',
              cursor: 'pointer',
            }}
            title="Copy narrative transcript"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'LOG COPIED' : '// COPY TRANSCRIPT'}
          </button>

          <button
            onClick={handleRestart}
            className="post-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              fontSize: '0.75rem',
              fontFamily: 'var(--mono)',
              background: 'var(--bg-2)',
              color: 'var(--text-2)',
              cursor: 'pointer',
            }}
            title="Restart Act"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Novel Header Info */}
      <div
        className="bracket-card"
        style={{
          padding: '16px 20px',
          marginBottom: '24px',
          background: 'linear-gradient(180deg, var(--bg-1) 0%, var(--bg-0) 100%)',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={15} style={{ color: 'var(--accent)' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--accent)', letterSpacing: '0.08em' }}>
              ACT 1: THE DILMUN DELUGE
            </span>
          </div>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--text-3)' }}>
            STATUS: POST-WAR 2000 ADV
          </span>
        </div>
        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-2)', fontFamily: 'var(--mono)' }}>
          Location: Dilmun Perimeter Outpost · Field Recovery Tent
        </p>
      </div>

      {/* Main Dialogue Log Display */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          marginBottom: '24px',
          minHeight: '280px',
        }}
      >
        {INITIAL_STEPS.slice(0, currentStepIndex + 1).map((step, idx) => {
          const isCurrent = idx === currentStepIndex;
          const isSoraishi = step.speaker === 'Soraishi';
          const isNarration = step.flavor === 'narration';
          const isInputStep = step.isInput;

          const displayText = step.text.replace(/Admiral/g, activeName);

          return (
            <div
              key={step.id}
              style={{
                padding: isNarration ? '14px 18px' : '16px 20px',
                borderRadius: '6px',
                background: isCurrent ? 'var(--bg-2)' : 'var(--bg-1)',
                border: isCurrent ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                transition: 'all 0.25s ease',
                boxShadow: isCurrent ? '0 0 16px rgba(196,147,104,0.06)' : 'none',
              }}
            >
              {/* Speaker Header */}
              {!isNarration && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '10px',
                    marginBottom: '8px',
                    fontFamily: 'var(--mono)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: isSoraishi ? 'var(--teal)' : 'var(--accent)',
                    }}
                  >
                    {isInputStep ? activeName : step.speaker}
                  </span>
                  {step.role && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-2)', letterSpacing: '0.04em' }}>
                      // {step.role}
                    </span>
                  )}
                </div>
              )}

              {/* Speaker Content / Input Form */}
              {isInputStep && !confirmedName ? (
                <form onSubmit={handleConfirmName} style={{ marginTop: '10px' }}>
                  <p style={{ color: 'var(--text-1)', fontSize: '0.9rem', marginBottom: '10px', fontStyle: 'italic' }}>
                    {step.text}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', maxWidth: '420px' }}>
                    <input
                      type="text"
                      className="editor-input"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Enter your name..."
                      autoFocus
                      required
                      style={{
                        padding: '8px 12px',
                        fontFamily: 'var(--mono)',
                        fontSize: '0.9rem',
                        background: 'var(--bg-0)',
                        border: '1px solid var(--accent)',
                        color: 'var(--text-0)',
                        borderRadius: '4px',
                        flex: 1,
                      }}
                    />
                    <button
                      type="submit"
                      className="post-btn"
                      style={{
                        padding: '8px 16px',
                        fontFamily: 'var(--mono)',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      CONFIRM →
                    </button>
                  </div>
                </form>
              ) : (
                <p
                  style={{
                    margin: 0,
                    fontSize: isNarration ? '0.88rem' : '0.95rem',
                    lineHeight: '1.7',
                    color: isNarration ? 'var(--text-2)' : 'var(--text-0)',
                    fontStyle: isNarration ? 'italic' : 'normal',
                    fontFamily: isNarration ? 'var(--sans)' : 'inherit',
                  }}
                >
                  {isInputStep ? `"...My name is ${activeName}."` : displayText}
                </p>
              )}
            </div>
          );
        })}
        <div ref={transcriptBottomRef} />
      </div>

      {/* Bottom Control Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
          background: 'var(--bg-1)',
          border: '1px solid var(--border)',
          borderRadius: '6px',
        }}
      >
        <div style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--text-2)' }}>
          {isFinished ? (
            <span style={{ color: 'var(--teal)' }}>// END OF ACT 1 PREVIEW</span>
          ) : (
            <span>
              STEP {currentStepIndex + 1} / {INITIAL_STEPS.length}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {!isFinished && !currentStep?.isInput && (
            <button
              onClick={handleNext}
              className="post-btn"
              style={{
                padding: '8px 20px',
                fontSize: '0.85rem',
                fontFamily: 'var(--mono)',
                cursor: 'pointer',
              }}
            >
              NEXT →
            </button>
          )}

          {isFinished && (
            <button
              onClick={handleRestart}
              className="post-btn"
              style={{
                padding: '8px 16px',
                fontSize: '0.85rem',
                fontFamily: 'var(--mono)',
                cursor: 'pointer',
              }}
            >
              REPLAY ACT 1
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
