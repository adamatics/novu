import { useContext, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import styled from '@emotion/styled';
import { useForm } from 'react-hook-form';
import * as Sentry from '@sentry/react';
import { Divider, Button as MantineButton, Center } from '@mantine/core';

import { AuthContext } from '../../store/authContext';
import { api } from '../../api/api.client';
import { PasswordInput, Button, colors, Input, Text } from '../../design-system';
import { GitHub } from '../../design-system/icons';
import { IS_DOCKER_HOSTED } from '../../config';
import { useVercelParams } from '../../hooks/use-vercelParams';
import { useAcceptInvite } from './use-accept-invite.hook';
import { buildGithubLink, buildVercelGithubLink } from './githubUtils';

type LoginFormProps = {
  invitationToken?: string;
  email?: string;
};

export function LoginForm({ email, invitationToken }: LoginFormProps) {
  const navigate = useNavigate();
  const { setToken } = useContext(AuthContext);
  const { isLoading, mutateAsync, isError, error } = useMutation<
    { token: string },
    { error: string; message: string; statusCode: number },
    {
      email: string;
      password: string;
    }
  >((data) => api.post(`/v1/auth/login`, data));
  const { isLoading: isLoadingAcceptInvite, submitToken } = useAcceptInvite();

  const { isFromVercel, code, next, configurationId } = useVercelParams();
  const vercelQueryParams = `code=${code}&next=${next}&configurationId=${configurationId}`;
  const signupLink = isFromVercel ? `/auth/signup?${vercelQueryParams}` : '/auth/signup';
  const resetPasswordLink = isFromVercel ? `/auth/reset/request?${vercelQueryParams}` : `/auth/reset/request`;
  const githubLink = isFromVercel
    ? buildVercelGithubLink({ code, next, configurationId })
    : buildGithubLink({ invitationToken });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: email || '',
      password: '',
    },
  });

  const onLogin = async (data) => {
    const itemData = {
      email: data.email,
      password: data.password,
    };

    try {
      const response = await mutateAsync(itemData);
      const token = (response as any).token;
      if (isFromVercel) {
        setToken(token);

        return;
      }

      if (invitationToken) {
        submitToken(token, invitationToken);

        return;
      }

      setToken(token);
      navigate('/templates');
    } catch (e: any) {
      if (e.statusCode !== 400) {
        Sentry.captureException(e);
      }
    }
  };

  const serverErrorString = useMemo<string>(() => {
    return Array.isArray(error?.message) ? error?.message[0] : error?.message;
  }, [error]);

  const emailServerError = useMemo<string>(() => {
    if (serverErrorString === 'email must be an email') return 'Please provide a valid email';

    return '';
  }, [serverErrorString]);

  return (
    <>
      {!IS_DOCKER_HOSTED && (
        <>
          <GitHubButton
            component="a"
            href={githubLink}
            my={30}
            variant="white"
            fullWidth
            radius="md"
            leftIcon={<GitHub />}
            sx={{ color: colors.B40, fontSize: '16px', fontWeight: 700, height: '50px' }}
            data-test-id="github-button"
          >
            Sign In with GitHub
          </GitHubButton>
          <Divider label={<Text color={colors.B40}>Or</Text>} color={colors.B30} labelPosition="center" my="md" />
        </>
      )}
      <form noValidate onSubmit={handleSubmit(onLogin)}>
        <Input
          error={errors.email?.message || emailServerError}
          {...register('email', {
            required: 'Please provide an email',
            pattern: { value: /^\S+@\S+\.\S+$/, message: 'Please provide a valid email' },
          })}
          required
          label="Email"
          placeholder="Type your email..."
          disabled={!!invitationToken}
          data-test-id="email"
          mt={5}
        />
        <PasswordInput
          error={errors.password?.message}
          mt={20}
          {...register('password', {
            required: 'Please input a password',
          })}
          required
          label="Password"
          placeholder="Type your password..."
          data-test-id="password"
        />

        <Link to={resetPasswordLink}>
          <Text my={30} gradient align="center">
            Forgot Your Password?
          </Text>
        </Link>

        <Button
          submit
          mt={60}
          inherit
          loading={isLoading || isLoadingAcceptInvite}
          disabled={isLoadingAcceptInvite}
          data-test-id="submit-btn"
        >
          {invitationToken ? 'Sign In & Accept' : 'Sign In'}
        </Button>
        <Center mt={20}>
          <Text mr={10} size="md" color={colors.B60}>
            Don't have an account yet?
          </Text>
          <Link to={signupLink}>
            <Text gradient>Sign Up</Text>
          </Link>
        </Center>
      </form>
      {isError && !emailServerError && (
        <Text data-test-id="error-alert-banner" mt={20} size="lg" weight="bold" align="center" color={colors.error}>
          {' '}
          {error?.message}
        </Text>
      )}
    </>
  );
}

const GitHubButton = styled(MantineButton)<{
  component: 'a';
  my: number;
  href: string;
  variant: 'white';
  fullWidth: boolean;
  radius: 'md';
  leftIcon: any;
  sx: any;
}>`
  :hover {
    color: ${colors.B40};
  }
`;
