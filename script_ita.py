import re

with open('frontend/src/pages/ITApprovals.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add pagination and export state
content = content.replace(
    "const [detailTarget, setDetailTarget] = useState<any>(null);",
    "const [detailTarget, setDetailTarget] = useState<any>(null);\n    const [currentPage, setCurrentPage] = useState(1);\n    const itemsPerPage = 10;"
)

# Replace table logic
content = content.replace(
    "const filtered = declarations.filter(d => activeTab === 'ALL' || d.status === activeTab);",
    "const filtered = declarations.filter(d => activeTab === 'ALL' || d.status === activeTab);\n    const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));\n    const currentData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);"
)

# Reset pagination on tab change
content = content.replace(
    "onClick={() => setActiveTab(tab)}",
    "onClick={() => { setActiveTab(tab); setCurrentPage(1); }}"
)

# Map over currentData
content = content.replace(
    "{filtered.map((d, i) => (",
    "{currentData.map((d, i) => ("
)

# Add pagination controls below table
pagination_ui = '''</table>
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} entries
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    style={{ padding: '6px 12px', border: '1px solid var(--border)', background: currentPage === 1 ? 'var(--bg-hover)' : '#fff', borderRadius: '6px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}>
                    Previous
                  </button>
                  <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: '0.85rem', fontWeight: 600 }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    style={{ padding: '6px 12px', border: '1px solid var(--border)', background: currentPage === totalPages ? 'var(--bg-hover)' : '#fff', borderRadius: '6px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}>
                    Next
                  </button>
                </div>
              </div>
            )}
'''
content = content.replace("</table>\n            </div>", pagination_ui)

with open('frontend/src/pages/ITApprovals.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done ITApprovals')
