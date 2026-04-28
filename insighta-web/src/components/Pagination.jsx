import React from 'react';

function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { page, totalPages, hasNextPage, hasPreviousPage, total } = pagination;

  return (
    <div className="pagination">
      <span className="pagination-info">
        Page {page} of {totalPages} ({total} total)
      </span>
      <div className="pagination-buttons">
        <button
          className="btn btn-sm"
          disabled={!hasPreviousPage}
          onClick={() => onPageChange(page - 1)}
        >
          ← Prev
        </button>
        {/* Show page numbers around current page */}
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum;
          if (totalPages <= 5) {
            pageNum = i + 1;
          } else if (page <= 3) {
            pageNum = i + 1;
          } else if (page >= totalPages - 2) {
            pageNum = totalPages - 4 + i;
          } else {
            pageNum = page - 2 + i;
          }
          return (
            <button
              key={pageNum}
              className={`btn btn-sm ${pageNum === page ? 'btn-primary' : ''}`}
              onClick={() => onPageChange(pageNum)}
            >
              {pageNum}
            </button>
          );
        })}
        <button
          className="btn btn-sm"
          disabled={!hasNextPage}
          onClick={() => onPageChange(page + 1)}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export default Pagination;
