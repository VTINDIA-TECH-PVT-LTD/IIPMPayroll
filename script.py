import re

with open('frontend/src/pages/UserManagement.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add pagination state
content = content.replace(
    "const [selectedUsers, setSelectedUsers] = useState<string[]>([]);",
    "const [selectedUsers, setSelectedUsers] = useState<string[]>([]);\n  const [currentPage, setCurrentPage] = useState(1);\n  const itemsPerPage = 10;"
)

# Reset pagination on search
content = content.replace(
    "const [search, setSearch] = useState('');",
    "const [search, setSearch] = useState('');\n  useEffect(() => { setCurrentPage(1); }, [search]);"
)

# Add currentData logic
content = content.replace(
    "const filtered = users.filter(u =>",
    "const filtered = users.filter(u =>"
)
content = content.replace(
    ".toLowerCase().includes(search.toLowerCase())\n    );",
    ".toLowerCase().includes(search.toLowerCase())\n    );\n\n  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));\n  const currentData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);"
)

# Replace filtered.map with currentData.map
content = content.replace(
    "{filtered.map(u => (",
    "{currentData.map(u => ("
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

# Fix Export button visibility
content = content.replace(
    "                <button className=\"btn-outline-iipm\" onClick={exportUsers}>Export All</button>\n              </>\n            )}",
    "              </>\n            )}\n            <button className=\"btn-outline-iipm\" onClick={exportUsers}>Export All</button>"
)

with open('frontend/src/pages/UserManagement.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done UserManagement')
