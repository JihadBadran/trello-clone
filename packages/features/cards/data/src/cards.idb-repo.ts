import { IDBPDatabase } from 'idb'
import { compareLww } from '@tc/foundation/utils'
import type { Card } from '@tc/cards/domain'

const STORE_NAME = 'cards'

export class CardsIDBRepository {
  constructor(private db: IDBPDatabase) {
    // Ensure the object store exists
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      throw new Error('Cards store does not exist in IndexedDB')
    }
  }

  async getCardsByBoardId(boardId: string): Promise<Card[]> {
    const tx = this.db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('board_id')
    let cursor = await index.openCursor(IDBKeyRange.only(boardId))

    const cards: Card[] = []
    while (cursor) {
      if (!cursor.value.deleted_at) {
        cards.push(cursor.value)
      }
      cursor = await cursor.continue()
    }

    // Sort by position
    return cards.sort((a, b) => a.position - b.position)
  }

  async getCardById(id: string): Promise<Card | null> {
    const tx = this.db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const card = await store.get(id)
    return card && !card.deleted_at ? card : null
  }

  async createCard(card: Omit<Card, 'id' | 'created_at' | 'updated_at'>): Promise<Card> {
    const newCard: Card = {
      ...card,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const tx = this.db.transaction(STORE_NAME, 'readwrite')
    await tx.objectStore(STORE_NAME).add(newCard)
    await tx.done

    return newCard
  }

  async updateCard(card: Card): Promise<Card> {
    const tx = this.db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    // Get the existing card to check version
    const existing = await store.get(card.id)
    if (existing && compareLww(existing, card) >= 0) {
      return existing // Existing version is newer or equal
    }

    // Update the card with new version and timestamp
    const updatedCard = {
      ...card,
      updated_at: new Date().toISOString(),
    }

    await store.put(updatedCard)
    await tx.done

    return updatedCard
  }

  async deleteCard(id: string): Promise<void> {
    const tx = this.db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    // Soft delete by setting deleted_at
    const card = await store.get(id)
    if (card) {
      card.deleted_at = new Date().toISOString()
      card.updated_at = new Date().toISOString()
      card.version = (card.version || 0) + 1
      await store.put(card)
    }

    await tx.done
  }

  // For syncing with cloud
  async upsertCard(card: Card): Promise<void> {
    const tx = this.db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    // Check if we already have this card
    const existing = await store.get(card.id)

    // If we don't have it or the incoming version is newer, save it
    if (!existing || compareLww(existing, card) < 0) {
      await store.put(card)
    }

    await tx.done
  }

  // Get cards modified after a specific timestamp
  async getModifiedAfter(timestamp: string): Promise<Card[]> {
    const tx = this.db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('updated_at')

    const cards: Card[] = []
    let cursor = await index.openCursor(IDBKeyRange.lowerBound(timestamp, true))

    while (cursor) {
      cards.push(cursor.value)
      cursor = await cursor.continue()
    }

    return cards
  }
}
