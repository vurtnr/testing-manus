interface Props {
  index: number;
  onClick: () => void;
}

export default function CitationMark({ index, onClick }: Props) {
  return (
    <span className="citation-mark" onClick={onClick}>
      {index}
    </span>
  );
}
