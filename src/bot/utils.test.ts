import { describe, it, afterEach, beforeEach, vi, expect } from 'vitest';
import {
  Collection,
  Message,
  EmbedBuilder,
  RESTJSONErrorCodes,
} from 'discord.js';

import {
  getCommandFromMessage,
  getFilterableContents,
  handleError,
} from '@/bot/utils';
import { Logger } from '@/utils/logger';
import { RED } from '@/constants/color';
import { PLACEHOLDER_NAME } from '@/constants/content';
import { RecoverableError } from '@/exceptions/recoverable';

// Disable threads in unit test
vi.mock('threads', () => {
  return {
    Pool: vi.fn(),
    Worker: vi.fn(),
  };
});

class MockError extends Error {
  public constructor(message: string, public readonly code?: number) {
    super(message);
  }
}

const url = 'foo bar';

describe('handleError', () => {
  beforeEach(() => {
    process.env.DSN = 'https://public@sentry.example.com/1';
    process.env.IMAGE_URL = url;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle unexpected errors', () => {
    const loggerSpy = vi.spyOn(Logger.getInstance(), 'logBot');
    loggerSpy.mockImplementationOnce(() => vi.fn());

    const error = new Error('Unexpected');

    const err = handleError(error);

    expect(loggerSpy).toHaveBeenCalledTimes(1);
    expect(loggerSpy).toHaveBeenCalledWith(error);
    expect(err).toBeInstanceOf(EmbedBuilder);
    expect(err?.data.author?.name).toBe('pleasantcord');
    expect(err?.data.author?.icon_url).toBe(url);
    expect(err?.data.color).toBe(RED);
    expect(err?.data.title).toBe('Ouch!');
    expect(err?.data.description).toBe(
      'Unfortunately, `pleasantcord` has encountered an unexpected error. The error has been reported to the system and will be resolved as soon as possible.\n\nIf this issue persists, please submit an issue to [GitHub](https://github.com/Namchee/pleasantcord/issues) or join [our support server](https://discord.gg/Pj4aGp8Aky) and submit your bug report on the appropriate channel.'
    );
  });

  it('should handle recoverable errors', () => {
    const loggerSpy = vi.spyOn(Logger.getInstance(), 'logBot');
    loggerSpy.mockImplementationOnce(() => vi.fn());

    const error = new RecoverableError('Hey, this error can easily be solved!');

    const err = handleError(error);

    expect(loggerSpy).toHaveBeenCalledTimes(1);
    expect(loggerSpy).toHaveBeenCalledWith(error);
    expect(err).toBeInstanceOf(EmbedBuilder);
    expect(err?.data.author?.name).toBe('pleasantcord');
    expect(err?.data.author?.icon_url).toBe(url);
    expect(err?.data.color).toBe(RED);
    expect(err?.data.title).toBe('Ouch!');
    expect(err?.data.description).toBe('Hey, this error can easily be solved!');
  });

  it('should ignore message deletion error', () => {
    const error = new MockError('foo', RESTJSONErrorCodes.UnknownMessage);

    const err = handleError(error);

    expect(err).toBeNull();
  });

  it('should handle missing access error', () => {
    const error = new MockError('foo', RESTJSONErrorCodes.MissingAccess);

    const err = handleError(error);

    expect(err).toBeInstanceOf(EmbedBuilder);
    expect(err?.data.author?.name).toBe('pleasantcord');
    expect(err?.data.author?.icon_url).toBe(url);
    expect(err?.data.color).toBe(RED);
    expect(err?.data.title).toBe('Insufficient Permissions');
    expect(err?.data.description).toBe(
      `\`pleasantcord\` lacks the required permissions to perform its duties`
    );
    expect(err?.data.fields?.length).toBe(1);
  });

  it('should handle missing permissions error', () => {
    const error = new MockError('foo', RESTJSONErrorCodes.MissingPermissions);

    const err = handleError(error);

    expect(err).toBeInstanceOf(EmbedBuilder);
    expect(err?.data.author?.name).toBe('pleasantcord');
    expect(err?.data.author?.icon_url).toBe(url);
    expect(err?.data.color).toBe(RED);
    expect(err?.data.title).toBe('Insufficient Permissions');
    expect(err?.data.description).toBe(
      `\`pleasantcord\` lacks the required permissions to perform its duties`
    );
    expect(err?.data.fields?.length).toBe(1);
  });

  it('should handle OAuth', () => {
    const error = new MockError(
      'foo',
      RESTJSONErrorCodes.MissingRequiredOAuth2Scope
    );

    const err = handleError(error);

    expect(err).toBeInstanceOf(EmbedBuilder);
    expect(err?.data.author?.name).toBe('pleasantcord');
    expect(err?.data.author?.icon_url).toBe(url);
    expect(err?.data.color).toBe(RED);
    expect(err?.data.title).toBe('Insufficient Permissions');
    expect(err?.data.description).toBe(
      `\`pleasantcord\` lacks the required permissions to perform its duties`
    );
    expect(err?.data.fields?.length).toBe(1);
  });
});

describe('getCommand', () => {
  it('should return actual command', () => {
    const msg = 'pc!help';
    const cmd = getCommandFromMessage(msg);

    expect(cmd).toBe('help');
  });

  it('should get the first argument only', () => {
    const msg = 'pc!help lorem ipsum';
    const cmd = getCommandFromMessage(msg);

    expect(cmd).toBe('help');
  });
});

describe('getFilterableContents', () => {
  it('should get all supported attachments', () => {
    const msg = {
      attachments: new Map([
        [
          '123',
          {
            url: 'foo',
            name: 'bar',
            contentType: 'image/jpeg',
          },
        ],
        [
          '233',
          {
            url: 'lorem',
            name: 'ipsum',
            contentType: 'image/png',
          },
        ],
        [
          '42352345',
          {
            url: 'a',
            name: 'b',
            contentType: 'video/mkv',
          },
        ],
        [
          '234312412341234',
          {
            url: 'c',
            name: 'd',
            contentType: '',
          },
        ],
      ]),
      embeds: [],
    } as unknown as Message;

    const contents = getFilterableContents(msg);

    expect(contents.length).toBe(2);
    expect(contents).toContainEqual({
      name: 'bar',
      url: 'foo',
    });
    expect(contents).toContainEqual({
      name: 'ipsum',
      url: 'lorem',
    });
  });

  it('should get all supported embeds', () => {
    const msg = {
      embeds: [
        new EmbedBuilder({
          video: {
            url: 'foo',
          },
          image: {
            url: 'wrong',
          },
        }),
        new EmbedBuilder({
          image: {
            url: 'bar',
          },
        }),
        new EmbedBuilder({
          thumbnail: {
            url: 'baz',
          },
        }),
        new EmbedBuilder({
          url: 'caz',
        }),
        new EmbedBuilder(),
      ],
      attachments: new Map(),
    } as unknown as Message;

    const contents = getFilterableContents(msg);

    expect(contents.length).toBe(4);
    expect(contents).toContainEqual({
      name: PLACEHOLDER_NAME,
      url: 'foo',
    });
    expect(contents).toContainEqual({
      name: PLACEHOLDER_NAME,
      url: 'bar',
    });
    expect(contents).toContainEqual({
      name: PLACEHOLDER_NAME,
      url: 'baz',
    });
    expect(contents).toContainEqual({
      name: PLACEHOLDER_NAME,
      url: 'caz',
    });
  });

  it('should get all stickers and emoji', () => {
    const msg = {
      content: '<:ayy:305818615712579584> foo bar <:ayy:305818615712579584>',
      stickers: new Collection([
        [
          '123',
          {
            url: 'https://foo.bar',
          },
        ],
      ]),
      attachments: new Map(),
      embeds: [],
    } as unknown as Message;

    const contents = getFilterableContents(msg, true);

    expect(contents.length).toBe(3);
    expect(contents).toContainEqual({
      name: PLACEHOLDER_NAME,
      url: 'https://cdn.discordapp.com/emojis/305818615712579584.png',
    });
    expect(contents).toContainEqual({
      name: PLACEHOLDER_NAME,
      url: 'https://foo.bar',
    });
  });
});
