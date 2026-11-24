import { describe, it, expect } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import Dexie from 'dexie'
import { Document, Page, Text, pdf } from '@react-pdf/renderer'

describe('Phase 1A Baseline Toolchain & Compatibility', () => {
  it('renders a React component under React 19', () => {
    const TestComponent = () => <div>Resume Studio Active</div>
    render(<TestComponent />)
    expect(screen.getByText('Resume Studio Active')).toBeInTheDocument()
  })

  it('supports IndexedDB operations via Dexie & fake-indexeddb', async () => {
    const testDb = new Dexie('test_db')
    testDb.version(1).stores({
      items: 'id, name',
    })

    await testDb.items.add({ id: '1', name: 'Master Variant' })
    const item = await testDb.items.get('1')
    expect(item).toBeDefined()
    expect(item.name).toBe('Master Variant')
    await testDb.delete()
  })

  it('initializes @react-pdf/renderer under React 19 cleanly', async () => {
    const TestPdfDoc = () => (
      <Document>
        <Page>
          <Text>Resume Studio PDF Test</Text>
        </Page>
      </Document>
    )

    // Verify document creation works without throwing fiber reconciler exceptions
    const docInstance = <TestPdfDoc />
    expect(docInstance).toBeDefined()

    // Test pdf() builder from @react-pdf/renderer
    let blob
    await act(async () => {
      const pdfInstance = pdf(docInstance)
      blob = await pdfInstance.toBlob()
    })
    expect(blob).toBeDefined()
  })
})
