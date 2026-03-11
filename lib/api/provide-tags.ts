export function createProvidesTags<TagType extends string>(tagType: TagType) {
  return <T extends { id: string }>(
    result: { items: readonly T[] } | undefined,
  ): { type: TagType; id: string }[] =>
    result
      ? [
          ...result.items.map(({ id }): { type: TagType; id: string } => ({
            type: tagType,
            id,
          })),
          { type: tagType, id: "LIST" },
        ]
      : [{ type: tagType, id: "LIST" }];
}
