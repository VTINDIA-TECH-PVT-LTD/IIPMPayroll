import re

with open('frontend/src/pages/PayrollManagement.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add pagination state
content = content.replace(
    "const [selectedPayrolls, setSelectedPayrolls] = useState<string[]>([]);",
    "const [selectedPayrolls, setSelectedPayrolls] = useState<string[]>([]);\n  const [currentPage, setCurrentPage] = useState(1);\n  const itemsPerPage = 10;"
)

# Add currentData logic for payrolls
content = content.replace(
    "const handleSelectAllPayrolls = (e: React.ChangeEvent<HTMLInputElement>) => {",
    "const totalPages = Math.max(1, Math.ceil(payrolls.length / itemsPerPage));\n  const currentPayrolls = payrolls.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);\n\n  const handleSelectAllPayrolls = (e: React.ChangeEvent<HTMLInputElement>) => {"
)

# Reset pagination when fetching payrolls
content = content.replace(
    "setPayrolls(data);",
    "setPayrolls(data);\n        setCurrentPage(1);"
)

# Replace payrolls.map with currentPayrolls.map
content = content.replace(
    "{payrolls.map((p: any) => (",
    "{currentPayrolls.map((p: any) => ("
)

# Add pagination controls below payrolls table
pagination_ui = '''</table>
                  </div>
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, payrolls.length)} of {payrolls.length} entries
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
content = content.replace("</table>\n                  </div>\n                )}\n              </div>\n            )}", pagination_ui + "\n                )}\n              </div>\n            )}")

with open('frontend/src/pages/PayrollManagement.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done PayrollManagement')
