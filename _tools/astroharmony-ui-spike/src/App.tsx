import { useEffect, useState } from 'react'
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useSpikeStore, type SpikeItem } from './store'
import { callNative, inJuce } from './jucebridge'

function Card({ item, isDragging }: { item: SpikeItem; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card ${isDragging ? 'dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      {item.label}
    </div>
  )
}

export default function App() {
  const items = useSpikeStore((s) => s.items)
  const bumps = useSpikeStore((s) => s.bumps)
  const bump = useSpikeStore((s) => s.bump)
  const reorder = useSpikeStore((s) => s.reorder)
  const reset = useSpikeStore((s) => s.reset)

  const [echo, setEcho] = useState<string>('(not called)')
  const [juceDetected, setJuceDetected] = useState<boolean>(false)

  useEffect(() => {
    setJuceDetected(inJuce())
  }, [])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = items.findIndex((i) => i.id === active.id)
    const to = items.findIndex((i) => i.id === over.id)
    if (from === -1 || to === -1) return
    const next = arrayMove(items, from, to)
    // arrayMove returns a fresh array — update store by replacing
    reorder(from, to)
    // Suppress unused variable warning while still proving arrayMove is callable
    void next
  }

  const onPing = async () => {
    try {
      const result = await callNative<string>('echoBack', `bumps=${bumps}, items=${items.length}`)
      setEcho(String(result))
    } catch (e) {
      setEcho(`ERROR: ${(e as Error).message}`)
    }
  }

  return (
    <div className="app">
      <h1 className="title">AstroHarmony Spike</h1>

      <div className="row">
        <span className="tag">JUCE backend:</span>
        <span className={`status-pill ${juceDetected ? 'ok' : 'no'}`}>
          {juceDetected ? 'detected' : 'browser mode'}
        </span>
      </div>

      <div className="row">
        <span className="tag">Bumps:</span>
        <span className="value">{bumps}</span>
        <button onClick={bump}>Bump (Zustand)</button>
        <button className="ghost" onClick={reset}>Reset</button>
      </div>

      <div>
        <div className="tag" style={{ marginBottom: 8 }}>Drag to reorder (proves @dnd-kit works):</div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div className="card-list">
              {items.map((it) => (
                <Card key={it.id} item={it} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <div>
        <div className="row" style={{ marginBottom: 8 }}>
          <span className="tag">Native bridge:</span>
          <button onClick={onPing}>Call echoBack()</button>
        </div>
        <div className="echo">{echo}</div>
      </div>
    </div>
  )
}
