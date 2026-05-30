import { openAiChat } from './chat';
import type { ChatMessage } from '../types.js';

// Mock environment variables
process.env.OPENAI_API_KEY = 'test_api_key';
process.env.OPENAI_MODEL = 'gpt-4o-mini';

// Mock the fetch function
global.fetch = jest.fn();

describe('openAiChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw an error if OPENAI_API_KEY is missing', async () => {
    delete process.env.OPENAI_API_KEY;
    await expect(openAiChat([{ role: 'user', content: 'Hello!' }])).rejects.toThrow('OPENAI_API_KEY missing');
  });

  it('should return a response from OpenAI API', async () => {
    const mockResponse = { choices: [{ message: { content: 'Hello, how can I help you?' } }] };
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValueOnce(mockResponse) });

    const messages: ChatMessage[] = [{ role: 'user', content: 'Hello!' }];
    const response = await openAiChat(messages);
    expect(response).toBe('Hello, how can I help you?');
  });

  it('should throw an error if response is not ok', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500, text: jest.fn().mockResolvedValueOnce('Internal Server Error') });

    const messages: ChatMessage[] = [{ role: 'user', content: 'Hello!' }];
    await expect(openAiChat(messages)).rejects.toThrow('OpenAI error 500: Internal Server Error');
  });

  it('should throw an error if response is empty', async () => {
    const mockResponse = { choices: [{}] };
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValueOnce(mockResponse) });

    const messages: ChatMessage[] = [{ role: 'user', content: 'Hello!' }];
    await expect(openAiChat(messages)).rejects.toThrow('Empty completion from OpenAI');
  });

  it('should throw an error if response contains invalid structure', async () => {
    const mockResponse = { choices: [{ message: {} }] };
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValueOnce(mockResponse) });

    const messages: ChatMessage[] = [{ role: 'user', content: 'Hello!' }];
    await expect(openAiChat(messages)).rejects.toThrow('Invalid response structure from OpenAI');
  });
});
