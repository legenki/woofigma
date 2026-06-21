import type { PathCommand } from "./tokenizer";

/**
 * Normalizes relative SVG path commands to absolute coordinates.
 *
 * SVG paths can use relative commands (lowercase letters) where coordinates
 * are relative to the current position, or absolute commands (uppercase letters)
 * where coordinates are relative to the origin. This function converts all
 * relative commands to their absolute equivalents for easier processing.
 *
 * @param commands - Array of raw path commands from the tokenizer
 * @returns Array of normalized commands with absolute coordinates
 *
 * @example
 * ```typescript
 * const commands = [
 *   { type: "M", args: [10, 20] },
 *   { type: "l", args: [5, 10] },    // relative line
 *   { type: "h", args: [15] }        // relative horizontal line
 * ];
 * const normalized = normalizeCommands(commands);
 * // Returns: [
 * //   { type: "M", args: [10, 20] },
 * //   { type: "L", args: [15, 30] }, // converted to absolute
 * //   { type: "L", args: [30, 30] }  // converted to absolute line
 * // ]
 * ```
 *
 * @remarks
 * The normalizer:
 * - Tracks current pen position throughout the path
 * - Converts relative commands to absolute equivalents
 * - Handles special cases like H/V commands becoming L commands
 * - Maintains path start position for Z command handling
 * - Processes multiple coordinate pairs in move commands (treated as line commands)
 */
export function normalizeCommands(
  commands: Array<PathCommand>
): Array<PathCommand> {
  const normalized: Array<PathCommand> = [];
  let currentX = 0;
  let currentY = 0;
  let pathStartX = 0;
  let pathStartY = 0;

  for (const cmd of commands) {
    const { type, args } = cmd;
    const upperType = type.toUpperCase();
    const isRelative = type !== upperType;

    switch (upperType) {
      case "M": {
        // First pair is the move command
        const arg0 = args[0] ?? 0;
        const arg1 = args[1] ?? 0;

        const x = isRelative ? currentX + arg0 : arg0;
        const y = isRelative ? currentY + arg1 : arg1;

        normalized.push({ type: "M", args: [x, y] });
        currentX = x;
        currentY = y;
        pathStartX = x;
        pathStartY = y;

        // Additional coordinate pairs after moveto are treated as lineto
        for (let i = 2; i < args.length; i += 2) {
          if (i + 1 >= args.length) {
            break;
          }

          const currentArg = args[i] ?? 0;
          const nextArg = args[i + 1] ?? 0;

          const lineX = isRelative ? currentX + currentArg : currentArg;
          const lineY = isRelative ? currentY + nextArg : nextArg;

          normalized.push({ type: "L", args: [lineX, lineY] });
          currentX = lineX;
          currentY = lineY;
        }
        break;
      }

      case "L": {
        for (let i = 0; i < args.length; i += 2) {
          if (i + 1 >= args.length) {
            break;
          }

          const currentArg = args[i] ?? 0;
          const nextArg = args[i + 1] ?? 0;

          const x = isRelative ? currentX + currentArg : currentArg;
          const y = isRelative ? currentY + nextArg : nextArg;

          normalized.push({ type: "L", args: [x, y] });
          currentX = x;
          currentY = y;
        }
        break;
      }

      case "H": {
        for (const arg of args) {
          const x = isRelative ? currentX + arg : arg;
          normalized.push({ type: "L", args: [x, currentY] });
          currentX = x;
        }
        break;
      }

      case "V": {
        for (const arg of args) {
          const y = isRelative ? currentY + arg : arg;
          normalized.push({ type: "L", args: [currentX, y] });
          currentY = y;
        }
        break;
      }

      case "C": {
        for (let i = 0; i < args.length; i += 6) {
          if (i + 5 >= args.length) {
            break;
          }

          const cp1x = isRelative ? currentX + (args[i] ?? 0) : (args[i] ?? 0);
          const cp1y = isRelative
            ? currentY + (args[i + 1] ?? 0)
            : (args[i + 1] ?? 0);
          const cp2x = isRelative
            ? currentX + (args[i + 2] ?? 0)
            : (args[i + 2] ?? 0);
          const cp2y = isRelative
            ? currentY + (args[i + 3] ?? 0)
            : (args[i + 3] ?? 0);
          const x = isRelative
            ? currentX + (args[i + 4] ?? 0)
            : (args[i + 4] ?? 0);
          const y = isRelative
            ? currentY + (args[i + 5] ?? 0)
            : (args[i + 5] ?? 0);

          normalized.push({ type: "C", args: [cp1x, cp1y, cp2x, cp2y, x, y] });
          currentX = x;
          currentY = y;
        }
        break;
      }

      case "Q": {
        for (let i = 0; i < args.length; i += 4) {
          if (i + 3 >= args.length) {
            break;
          }
          const cpx = isRelative ? currentX + (args[i] ?? 0) : (args[i] ?? 0);
          const cpy = isRelative
            ? currentY + (args[i + 1] ?? 0)
            : (args[i + 1] ?? 0);
          const x = isRelative
            ? currentX + (args[i + 2] ?? 0)
            : (args[i + 2] ?? 0);
          const y = isRelative
            ? currentY + (args[i + 3] ?? 0)
            : (args[i + 3] ?? 0);

          normalized.push({ type: "Q", args: [cpx, cpy, x, y] });
          currentX = x;
          currentY = y;
        }
        break;
      }

      case "A": {
        for (let i = 0; i < args.length; i += 7) {
          if (i + 6 >= args.length) {
            break;
          }

          const rx = Math.abs(args[i] ?? 0);
          const ry = Math.abs(args[i + 1] ?? 0);
          const xAxisRotation = args[i + 2] ?? 0;
          const largeArcFlag = args[i + 3] ?? 0;
          const sweepFlag = args[i + 4] ?? 0;
          const x = isRelative
            ? currentX + (args[i + 5] ?? 0)
            : (args[i + 5] ?? 0);
          const y = isRelative
            ? currentY + (args[i + 6] ?? 0)
            : (args[i + 6] ?? 0);

          normalized.push({
            type: "A",
            args: [rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y],
          });
          currentX = x;
          currentY = y;
        }
        break;
      }

      case "S": {
        for (let i = 0; i < args.length; i += 4) {
          if (i + 3 >= args.length) {
            break;
          }
          const cp2x = isRelative ? currentX + (args[i] ?? 0) : (args[i] ?? 0);
          const cp2y = isRelative
            ? currentY + (args[i + 1] ?? 0)
            : (args[i + 1] ?? 0);
          const x = isRelative
            ? currentX + (args[i + 2] ?? 0)
            : (args[i + 2] ?? 0);
          const y = isRelative
            ? currentY + (args[i + 3] ?? 0)
            : (args[i + 3] ?? 0);

          normalized.push({ type: "S", args: [cp2x, cp2y, x, y] });
          currentX = x;
          currentY = y;
        }
        break;
      }

      case "T": {
        for (let i = 0; i < args.length; i += 2) {
          if (i + 1 >= args.length) {
            break;
          }
          const x = isRelative ? currentX + (args[i] ?? 0) : (args[i] ?? 0);
          const y = isRelative
            ? currentY + (args[i + 1] ?? 0)
            : (args[i + 1] ?? 0);

          normalized.push({ type: "T", args: [x, y] });
          currentX = x;
          currentY = y;
        }
        break;
      }

      case "Z": {
        normalized.push({ type: "Z", args: [] });
        currentX = pathStartX;
        currentY = pathStartY;
        break;
      }
      default: {
        break;
      }
    }
  }

  return normalized;
}
