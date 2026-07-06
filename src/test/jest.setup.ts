import { jest } from '@jest/globals';

// Mock GitHub API
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    rest: {
      pulls: {
        get: jest.fn(),
        listFiles: jest.fn(),
        createReview: jest.fn(),
        createReviewComment: jest.fn(),
      },
      repos: {
        getContent: jest.fn(),
        compareCommits: jest.fn(),
      },
      issues: {
        createComment: jest.fn(),
      },
    },
  })),
}));

// Mock Notion API
jest.mock('@notionhq/client', () => ({
  Client: jest.fn().mockImplementation(() => ({
    pages: {
      create: jest.fn(),
      update: jest.fn(),
      retrieve: jest.fn(),
    },
    databases: {
      query: jest.fn(),
    },
  })),
}));

// Mock axios
jest.mock('axios', () => ({
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock dotenv
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));
